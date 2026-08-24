import { Module } from '@nestjs/common'
import { DiscordApiKeyGuard } from './discord-api-key.guard'
import { DiscordServiceCredentialService } from './discord-service-credential.service'
import { DiscordController } from './discord.controller'
import { DiscordService } from './discord.service'

// Deliberately does not call ThrottlerModule.forRoot() -- see
// launcher.module.ts's identical comment; it is effectively global once
// registered in media.module.ts, and a second forRoot() call would
// silently collide rather than create an isolated bucket.
@Module({
  controllers: [DiscordController],
  providers: [DiscordService, DiscordServiceCredentialService, DiscordApiKeyGuard],
  exports: [DiscordServiceCredentialService]
})
export class IntegrationsDiscordModule {}
