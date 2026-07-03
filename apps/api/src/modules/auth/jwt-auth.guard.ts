import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Role } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { permissionsForRole } from './permissions'
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
    private readonly prisma: PrismaService
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
        where: { id: payload.sub }
      })

      if (!account || account.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is not active')
      }

      request.user = {
        id: account.id,
        username: account.username,
        name: account.name,
        email: account.email,
        role: account.role as Role,
        permissions: permissionsForRole(account.role)
      }

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
