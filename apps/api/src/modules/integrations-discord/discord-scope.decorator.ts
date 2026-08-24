import { SetMetadata } from '@nestjs/common'

export const discordScopeMetadataKey = 'bloodmoon:discord-scope'

// Part S -- explicit scopes, not a big IAM framework: discord:server:read,
// discord:events:read, discord:rankings:read, discord:news:read.
export const RequireDiscordScope = (scope: string) => SetMetadata(discordScopeMetadataKey, scope)
