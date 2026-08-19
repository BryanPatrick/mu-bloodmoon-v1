import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { createHash } from 'node:crypto'
import { generate as generateTotp } from 'otplib'
import { PrismaService } from '../../database/prisma.service'
import { AuthService } from '../auth/auth.service'
import { TwoFactorService } from '../auth/two-factor.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { GuildsService } from '../guilds/guilds.service'
import {
  ACCOUNT_PERSONAS,
  ALL_PERSONAS,
  GUILD_PERSONA_ROLE_KEY,
  GUILD_PERSONAS,
  type AccountPersonaId,
  type ActivatePersonaResponse,
  type GuildPersonaId,
  type PersonaId
} from './test-personas.contract'
import { isSuperAdminPersonaAllowed, isTestPersonaEnvironmentSafe, testPersonaFixturePassword } from './test-personas.env'

const TEST_GUILD_TAG = 'TSTP'
const TEST_GUILD_NAME = 'Test Persona Guild'
// Real Account.username validation caps length at 20 chars (auth.service.ts
// register()) -- 'testpersona_guild_treasurer' alone would already blow past
// that, so the prefix has to stay short. 'tp_' plus the persona name (all
// lowercase, already <= 15 chars for the longest persona) fits every combo
// with room to spare. The account's `name` field carries the full
// "Test Persona <LABEL>" description instead, since that field has no such
// limit.
const FIXTURE_USERNAME_PREFIX = 'tp_'

type LoginContext = { ip: string | null; device: string | null }

@Injectable()
export class TestPersonaService {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly twoFactor: TwoFactorService,
    private readonly guilds: GuildsService
  ) {}

  private assertSafe() {
    if (!isTestPersonaEnvironmentSafe()) {
      throw new ForbiddenException('Test personas are not available in this environment.')
    }
  }

  async listAvailable(): Promise<PersonaId[]> {
    this.assertSafe()
    const list: PersonaId[] = ['PLAYER', 'GM', 'ADMIN', ...GUILD_PERSONAS]
    if (isSuperAdminPersonaAllowed()) list.push('SUPER_ADMIN')
    return list
  }

  async activate(personaInput: string | undefined, context: LoginContext): Promise<ActivatePersonaResponse> {
    this.assertSafe()
    const persona = (personaInput || '').trim() as PersonaId
    if (!ALL_PERSONAS.includes(persona)) {
      throw new BadRequestException('Unknown persona id.')
    }
    if (persona === 'SUPER_ADMIN' && !isSuperAdminPersonaAllowed()) {
      throw new ForbiddenException('SUPER_ADMIN persona is not enabled in this environment.')
    }
    if ((ACCOUNT_PERSONAS as readonly string[]).includes(persona)) {
      return this.activateAccountPersona(persona as AccountPersonaId, context)
    }
    return this.activateGuildPersona(persona as GuildPersonaId, context)
  }

  async reset(): Promise<{ removedAccounts: number; removedGuild: boolean }> {
    this.assertSafe()
    const guild = await this.prisma.guild.findFirst({ where: { tag: TEST_GUILD_TAG } })
    if (guild) {
      await this.prisma.guildMovementApproval.deleteMany({ where: { movement: { guildId: guild.id } } })
      await this.prisma.guildMovement.deleteMany({ where: { guildId: guild.id } })
      await this.prisma.guild.delete({ where: { id: guild.id } })
    }
    const accounts = await this.prisma.account.findMany({
      where: { username: { startsWith: FIXTURE_USERNAME_PREFIX } },
      select: { id: true }
    })
    const accountIds = accounts.map((a) => a.id)
    if (accountIds.length) {
      await this.prisma.accountCurrency.deleteMany({ where: { accountId: { in: accountIds } } })
      await this.prisma.accountCharacter.deleteMany({ where: { accountId: { in: accountIds } } })
      await this.prisma.account.deleteMany({ where: { id: { in: accountIds } } })
    }
    return { removedAccounts: accountIds.length, removedGuild: Boolean(guild) }
  }

  // ---- account-role personas -------------------------------------------

  private async ensureAccount(username: string, label: string) {
    let account = await this.prisma.account.findUnique({ where: { username } })
    if (!account) {
      const registered = await this.authService.register({
        name: `Test Persona ${label}`,
        username,
        password: testPersonaFixturePassword(),
        personalId: createHash('sha256').update(username).digest('hex').slice(0, 10),
        email: `${username}@test-persona.invalid`,
        captchaToken: ''
      })
      account = await this.prisma.account.findUniqueOrThrow({ where: { id: registered.id } })
    }
    return account
  }

  private async ensureTwoFactor(accountId: string) {
    const secret = this.twoFactor.generateSecret()
    await this.prisma.account.update({
      where: { id: accountId },
      data: { twoFactorEnabled: true, twoFactorSecret: this.twoFactor.encrypt(secret) }
    })
    return secret
  }

  private async activateAccountPersona(persona: AccountPersonaId, context: LoginContext): Promise<ActivatePersonaResponse> {
    const username = `${FIXTURE_USERNAME_PREFIX}${persona.toLowerCase()}`
    let account = await this.ensureAccount(username, persona)

    let totpCode: string | undefined
    if (persona !== 'PLAYER') {
      const secret = await this.ensureTwoFactor(account.id)
      totpCode = await generateTotp({ secret })
    }
    if (account.role !== persona) {
      account = await this.prisma.account.update({ where: { id: account.id }, data: { role: persona } })
    }

    const login = await this.authService.login(
      { username, password: testPersonaFixturePassword(), totpCode, captchaToken: '' },
      context
    )
    return {
      accessToken: login.accessToken,
      refreshToken: login.refreshToken,
      persona,
      user: { id: account.id, username, role: account.role }
    }
  }

  // ---- guild-role personas -----------------------------------------------

  private guildPersonaUsername(persona: GuildPersonaId) {
    return `${FIXTURE_USERNAME_PREFIX}${persona.toLowerCase()}`
  }

  private async ensureGuildPersonaAccount(persona: GuildPersonaId) {
    const username = this.guildPersonaUsername(persona)
    const account = await this.ensureAccount(username, persona)
    let character = await this.prisma.accountCharacter.findFirst({ where: { accountId: account.id } })
    if (!character) {
      character = await this.prisma.accountCharacter.create({
        data: {
          accountId: account.id,
          key: `test-persona-${username}`,
          name: `TP${persona.replace('GUILD_', '').slice(0, 16)}`.slice(0, 20),
          className: 'Dark Knight'
        }
      })
    }
    return { account, character }
  }

  private asAuthenticatedUser(account: { id: string; username: string; name: string; email: string; role: string }): AuthenticatedUser {
    return {
      id: account.id,
      username: account.username,
      name: account.name,
      email: account.email,
      role: account.role as AuthenticatedUser['role'],
      permissions: [],
      twoFactorEnabled: false
    }
  }

  // Idempotent: reuses the existing Test Persona Guild (tag TSTP) if one is
  // still ACTIVE, otherwise provisions all five guild-role fixture accounts
  // and builds it from scratch through the real self-service/role/join
  // service methods -- the same mutations a real leader/officer/player would
  // trigger, never a raw membership-row insert.
  private async ensureTestGuild() {
    const existing = await this.prisma.guild.findFirst({ where: { tag: TEST_GUILD_TAG, status: 'ACTIVE' } })
    if (existing) return existing

    const leader = await this.ensureGuildPersonaAccount('GUILD_LEADER')
    const officer = await this.ensureGuildPersonaAccount('GUILD_OFFICER')
    const treasurer = await this.ensureGuildPersonaAccount('GUILD_TREASURER')
    const member = await this.ensureGuildPersonaAccount('GUILD_MEMBER')
    const recruit = await this.ensureGuildPersonaAccount('GUILD_RECRUIT')

    // A previous partial run (crash mid-provisioning) can leave these
    // characters holding stale memberships in a guild that no longer
    // exists as ACTIVE -- clear that before rebuilding.
    await this.prisma.guildMember.deleteMany({
      where: { characterId: { in: [leader, officer, treasurer, member, recruit].map((p) => p.character.id) } }
    })

    const leaderUser = this.asAuthenticatedUser(leader.account)
    const guild = await this.guilds.createGuildSelfService(
      {
        name: TEST_GUILD_NAME,
        tag: TEST_GUILD_TAG,
        description: 'Fixture guild for Test Personas -- automated dev/E2E use only.',
        recruitment: 'OPEN',
        leaderCharacterId: leader.character.id
      },
      leaderUser
    )

    for (const fixture of [officer, treasurer, member, recruit]) {
      const fixtureUser = this.asAuthenticatedUser(fixture.account)
      await this.guilds.join(guild.slug, { characterId: fixture.character.id }, fixtureUser)
    }

    const promotions: [typeof officer, GuildPersonaId][] = [
      [officer, 'GUILD_OFFICER'],
      [treasurer, 'GUILD_TREASURER'],
      [recruit, 'GUILD_RECRUIT']
    ]
    for (const [fixture, persona] of promotions) {
      const membership = await this.prisma.guildMember.findUniqueOrThrow({ where: { characterId: fixture.character.id } })
      await this.guilds.updateMemberRole(
        guild.slug,
        membership.id,
        { roleKey: GUILD_PERSONA_ROLE_KEY[persona] },
        leaderUser
      )
    }
    // GUILD_MEMBER keeps the default 'MEMBER' roleKey join() already assigned.

    return this.prisma.guild.findUniqueOrThrow({ where: { id: guild.id } })
  }

  private async activateGuildPersona(persona: GuildPersonaId, context: LoginContext): Promise<ActivatePersonaResponse> {
    const guild = await this.ensureTestGuild()
    const username = this.guildPersonaUsername(persona)
    const account = await this.prisma.account.findUniqueOrThrow({ where: { username } })
    const login = await this.authService.login(
      { username, password: testPersonaFixturePassword(), captchaToken: '' },
      context
    )
    return {
      accessToken: login.accessToken,
      refreshToken: login.refreshToken,
      persona,
      user: { id: account.id, username, role: account.role },
      guild: { slug: guild.slug, tag: guild.tag, roleKey: GUILD_PERSONA_ROLE_KEY[persona] }
    }
  }
}
