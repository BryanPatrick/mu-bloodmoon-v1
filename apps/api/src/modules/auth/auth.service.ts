import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Account, AccountCurrency, Role } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  SessionUser
} from './auth.contract'
import type { AuthenticatedUser } from './auth.types'
import { permissionsForRole } from './permissions'

const demoAdmin = {
  username: 'admin',
  password: 'admin',
  personalId: 'admin',
  name: 'admin',
  email: 'admin@bloodmoon.local'
}

const demoPlayer = {
  username: 'player',
  password: 'player',
  personalId: 'player',
  name: 'player',
  email: 'player@bloodmoon.local'
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService
  ) {}

  async login(payload: LoginRequest): Promise<LoginResponse> {
    await this.ensureDemoAccounts()

    const username = payload.username.trim().toLowerCase()
    const account = await this.prisma.account.findUnique({
      where: { username },
      include: { currencies: true }
    })

    if (!account || account.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials')
    }

    const passwordMatches = await bcrypt.compare(payload.password, account.passwordHash)
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const sessionAccount = await this.prisma.account.update({
      where: { id: account.id },
      data: { sessionVersion: { increment: 1 } },
      include: { currencies: true }
    })

    await this.audit.record({
      actorId: sessionAccount.id,
      actorUsername: sessionAccount.username,
      action: account.sessionVersion > 0 ? 'auth.session.replaced' : 'auth.session.started',
      targetType: 'Account',
      targetId: sessionAccount.id,
      severity: account.sessionVersion > 0 ? 'warning' : 'info',
      metadata: {
        previousSessionVersion: account.sessionVersion,
        sessionVersion: sessionAccount.sessionVersion
      }
    })

    return {
      accessToken: await this.signAccessToken(sessionAccount),
      refreshToken: await this.signRefreshToken(sessionAccount),
      user: this.toSessionUser(sessionAccount)
    }
  }

  async register(payload: RegisterRequest): Promise<RegisterResponse> {
    const name = payload.name?.trim()
    const username = payload.username?.trim().toLowerCase()
    const email = payload.email?.trim().toLowerCase()
    const password = payload.password || ''
    const personalId = payload.personalId?.trim()

    if (!name || !username || !email || !password || !personalId) {
      throw new BadRequestException('Required fields are missing')
    }

    if (username.length < 3 || username.length > 20 || !/^[a-z0-9_-]+$/.test(username)) {
      throw new BadRequestException('Invalid username')
    }

    if (password.length < 4 || password.length > 72) {
      throw new BadRequestException('Invalid password')
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Invalid email')
    }

    const existing = await this.prisma.account.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    })

    if (existing?.username === username) {
      throw new ConflictException('Username already exists')
    }

    if (existing?.email === email) {
      throw new ConflictException('Email already exists')
    }

    const account = await this.prisma.account.create({
      data: {
        username,
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        personalIdHash: await bcrypt.hash(personalId, 12),
        role: 'PLAYER',
        status: 'ACTIVE',
        currencies: {
          create: [
            { currency: 'WCOIN', balance: 0 },
            { currency: 'GOBLIN_POINT', balance: 0 },
            { currency: 'HUNT_POINT', balance: 0 }
          ]
        }
      }
    })

    await this.audit.record({
      actorId: account.id,
      actorUsername: account.username,
      action: 'auth.account.registered',
      targetType: 'Account',
      targetId: account.id,
      metadata: {
        reference: payload.reference?.trim() || null
      }
    })

    return {
      id: account.id,
      username: account.username,
      email: account.email,
      status: account.status
    }
  }

  async changePassword(payload: ChangePasswordRequest, user: AuthenticatedUser): Promise<ChangePasswordResponse> {
    const currentPassword = payload.currentPassword || ''
    const personalId = payload.personalId?.trim()
    const newPassword = payload.newPassword || ''

    if (!currentPassword || !personalId || !newPassword) {
      throw new BadRequestException('Required fields are missing')
    }

    if (newPassword.length < 4 || newPassword.length > 72) {
      throw new BadRequestException('Invalid password')
    }

    const account = await this.prisma.account.findUnique({
      where: { id: user.id }
    })

    if (!account || account.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials')
    }

    const passwordMatches = await bcrypt.compare(currentPassword, account.passwordHash)
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (!account.personalIdHash) {
      throw new BadRequestException('Personal ID is not configured for this account')
    }

    const personalIdMatches = await bcrypt.compare(personalId, account.personalIdHash)
    if (!personalIdMatches) {
      throw new UnauthorizedException('Invalid personal ID')
    }

    await this.prisma.account.update({
      where: { id: account.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 12),
        sessionVersion: { increment: 1 }
      }
    })

    await this.audit.record({
      actorId: account.id,
      actorUsername: account.username,
      action: 'auth.password.changed',
      targetType: 'Account',
      targetId: account.id,
      metadata: {
        username: account.username
      }
    })

    return { ok: true }
  }

  async logout(user: AuthenticatedUser) {
    const account = await this.prisma.account.update({
      where: { id: user.id },
      data: { sessionVersion: { increment: 1 } }
    })

    await this.audit.record({
      actorId: account.id,
      actorUsername: account.username,
      action: 'auth.session.ended',
      targetType: 'Account',
      targetId: account.id,
      metadata: { sessionVersion: account.sessionVersion }
    })

    return { ok: true }
  }

  private async ensureDemoAccounts() {
    await Promise.all([
      this.ensureDemoAccount(demoAdmin, 'ADMIN'),
      this.ensureDemoAccount(demoPlayer, 'PLAYER')
    ])
  }

  private async ensureDemoAccount(seed: typeof demoAdmin, role: Role) {
    const existing = await this.prisma.account.findUnique({
      where: { username: seed.username }
    })

    if (existing) {
      if (!existing.personalIdHash) {
        await this.prisma.account.update({
          where: { id: existing.id },
          data: {
            personalIdHash: await bcrypt.hash(seed.personalId, 12)
          }
        })
      }

      return existing
    }

    return this.prisma.account.create({
      data: {
        username: seed.username,
        name: seed.name,
        email: seed.email,
        passwordHash: await bcrypt.hash(seed.password, 12),
        personalIdHash: await bcrypt.hash(seed.personalId, 12),
        role,
        status: 'ACTIVE',
        currencies: {
          create: [
            { currency: 'WCOIN', balance: role === 'ADMIN' ? 1250 : 50 },
            { currency: 'GOBLIN_POINT', balance: role === 'ADMIN' ? 340 : 0 },
            { currency: 'HUNT_POINT', balance: role === 'ADMIN' ? 8750 : 320 }
          ]
        }
      }
    })
  }

  private async signAccessToken(account: Account) {
    return this.jwt.signAsync({
      sub: account.id,
      username: account.username,
      role: account.role,
      sessionVersion: account.sessionVersion
    }, {
      expiresIn: process.env.JWT_ACCESS_TTL || '15m'
    })
  }

  private async signRefreshToken(account: Account) {
    return this.jwt.signAsync({
      sub: account.id,
      username: account.username,
      role: account.role,
      sessionVersion: account.sessionVersion,
      type: 'refresh'
    }, {
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_ACCESS_SECRET || 'dev-refresh-secret-change-me',
      expiresIn: process.env.JWT_REFRESH_TTL || '7d'
    })
  }

  private toSessionUser(account: Account & { currencies?: AccountCurrency[] }): SessionUser {
    return {
      id: account.id,
      username: account.username,
      name: account.name,
      role: account.role,
      permissions: permissionsForRole(account.role),
      currencies: (account.currencies || []).map((currency) => ({
        currency: currency.currency,
        balance: currency.balance
      }))
    }
  }
}
