import { createHash, randomBytes } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

// Phase 3B Part R/S. Dedicated, revocable service credential for the
// Discord read-only integration -- never the Launcher's user session,
// never a SUPER_ADMIN JWT, never the GameBridge HMAC secret (see
// docs/integrations/discord-read-api.md). Only a hash is ever persisted,
// matching PasswordResetToken's existing pattern in this codebase; the
// raw key is returned exactly once, at issuance, and never again.
const KEY_PREFIX = 'discbot_'

function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

@Injectable()
export class DiscordServiceCredentialService {
  constructor(private readonly prisma: PrismaService) {}

  // Not exposed via any HTTP route this phase (no admin UI/CRUD yet --
  // Part W). Issuance is an operator action (a script/manual DB action),
  // matching this phase's "no admin endpoint" scope. Returns the raw key
  // exactly once -- callers must persist it themselves; it is never
  // retrievable again.
  async issue(label: string, scopes: string[]): Promise<{ id: string; rawKey: string }> {
    const rawKey = KEY_PREFIX + randomBytes(32).toString('hex')
    const created = await this.prisma.discordServiceCredential.create({
      data: { label, keyHash: hashKey(rawKey), scopes: scopes.join(',') }
    })
    return { id: created.id, rawKey }
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.discordServiceCredential.update({
      where: { id },
      data: { revokedAt: new Date() }
    })
  }

  // Verifies a raw key against stored hashes and confirms it carries the
  // required scope, without ever comparing/logging the raw value.
  async verify(rawKey: string, requiredScope: string): Promise<boolean> {
    if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) {
      return false
    }
    const credential = await this.prisma.discordServiceCredential.findUnique({
      where: { keyHash: hashKey(rawKey) }
    })
    if (!credential || credential.revokedAt) {
      return false
    }
    const scopes = credential.scopes.split(',')
    if (!scopes.includes(requiredScope) && !scopes.includes('discord:*')) {
      return false
    }
    await this.prisma.discordServiceCredential
      .update({ where: { id: credential.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined) // best-effort telemetry only, never blocks a real request
    return true
  }
}
