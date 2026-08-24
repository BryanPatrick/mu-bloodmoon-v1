import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { discordScopeMetadataKey } from './discord-scope.decorator'
import { DiscordServiceCredentialService } from './discord-service-credential.service'

// Phase 3B Part R. A dedicated Discord service credential, never the
// Launcher session / SUPER_ADMIN JWT / GameBridge HMAC secret (see
// docs/integrations/discord-read-api.md). Missing or wrong credential is
// rejected identically (401) -- no distinguishing error that would help
// an attacker enumerate valid key formats.
@Injectable()
export class DiscordApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly credentials: DiscordServiceCredentialService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredScope = this.reflector.getAllAndOverride<string | undefined>(discordScopeMetadataKey, [
      context.getHandler(),
      context.getClass()
    ])
    if (!requiredScope) {
      // Every Discord route must declare a scope explicitly -- fail
      // closed if one forgets to, rather than allowing unrestricted access.
      throw new UnauthorizedException('Missing Discord scope declaration')
    }

    const request = context.switchToHttp().getRequest<Request>()
    const rawKey = request.headers['x-discord-api-key']
    const key = Array.isArray(rawKey) ? rawKey[0] : rawKey

    const ok = key ? await this.credentials.verify(key, requiredScope) : false
    if (!ok) {
      throw new UnauthorizedException('Invalid or missing Discord service credential')
    }
    return true
  }
}
