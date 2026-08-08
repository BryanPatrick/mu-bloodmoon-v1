import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Role } from '@prisma/client'
import { RequestContextService } from '../../common/request-context.service'
import { PrismaService } from '../../database/prisma.service'
import { permissionsForAccount } from './permissions'
import type { AccessTokenPayload, AuthenticatedUser } from './auth.types'

type RequestWithHeaders = {
  headers: {
    authorization?: string
  }
  user?: AuthenticatedUser
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>()
    const token = this.extractBearerToken(request.headers.authorization)

    if (!token) {
      throw new UnauthorizedException('Missing bearer token')
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token)
      const account = await this.prisma.account.findUnique({
        where: { id: payload.sub },
        include: { permissions: true }
      })

      if (!account || account.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is not active')
      }

      if (payload.sessionVersion !== account.sessionVersion) {
        throw new UnauthorizedException('Session was replaced by a newer login')
      }

      const session = payload.sid ? await this.prisma.accountSession.findUnique({ where: { id: payload.sid } }) : null
      if (!session || session.accountId !== account.id || session.revokedAt || session.expiresAt <= new Date()) {
        throw new UnauthorizedException('Session is no longer active')
      }

      try {
        await this.prisma.accountSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      } catch {
        // Best-effort activity tracking only. Two concurrent requests on the
        // same session (a double-click, or two tabs) can race this UPDATE
        // and hit MySQL 1020 "Record has changed since last read" -- the
        // session itself was already verified valid above, so a transient
        // write conflict here must never turn a legitimate request into a
        // 401. Losing one lastSeenAt tick is harmless.
      }

      request.user = {
        id: account.id,
        username: account.username,
        name: account.name,
        email: account.email,
        role: account.role as Role,
        permissions: permissionsForAccount(account.role, account.permissions),
        sessionVersion: account.sessionVersion,
        sessionId: session.id
      }
      this.requestContext.setActor({
        userId: account.id,
        role: account.role,
        sessionId: session.id
      })

      return true
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }

      throw new UnauthorizedException('Invalid bearer token')
    }
  }

  private extractBearerToken(header?: string) {
    const [type, token] = header?.split(' ') || []
    return type === 'Bearer' ? token : undefined
  }
}
