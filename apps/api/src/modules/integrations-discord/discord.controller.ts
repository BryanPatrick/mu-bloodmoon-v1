import { Controller, Get, UseGuards } from '@nestjs/common'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import { DiscordApiKeyGuard } from './discord-api-key.guard'
import { RequireDiscordScope } from './discord-scope.decorator'
import { DiscordService } from './discord.service'

// Phase 3B Part O. Dedicated, read-only integration boundary -- never
// shares the Admin API, Launcher session, GameBridge command credentials,
// or SQL credentials (docs/integrations/discord-read-api.md). Every
// route requires its own dedicated Discord service credential (Part R)
// and declares its own explicit scope (Part S) -- there is no mutation
// route anywhere in this controller.
@Controller('integrations/discord')
@UseGuards(DiscordApiKeyGuard, ThrottlerGuard)
export class DiscordController {
  constructor(private readonly discord: DiscordService) {}

  @Get('server-status')
  @RequireDiscordScope('discord:server:read')
  @Throttle({ default: { ttl: 15_000, limit: 4 } }) // Part T: 15-60s cache-shaped
  serverStatus() {
    return this.discord.getServerStatus()
  }

  @Get('events')
  @RequireDiscordScope('discord:events:read')
  @Throttle({ default: { ttl: 30_000, limit: 2 } }) // Part T: 30-60s
  events() {
    return this.discord.getEvents()
  }

  @Get('rankings')
  @RequireDiscordScope('discord:rankings:read')
  @Throttle({ default: { ttl: 60_000, limit: 1 } }) // Part T: 1-5min
  rankings() {
    return this.discord.getRankings()
  }

  @Get('news')
  @RequireDiscordScope('discord:news:read')
  @Throttle({ default: { ttl: 300_000, limit: 1 } }) // Part T: several minutes
  news() {
    return this.discord.getNews()
  }
}
