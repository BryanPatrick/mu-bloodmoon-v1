import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { LauncherService } from './launcher.service'

@Controller('launcher')
export class LauncherController {
  constructor(private readonly launcherService: LauncherService) {}

  @Get('bootstrap')
  bootstrap() {
    return this.launcherService.bootstrap()
  }

  @Get('account')
  @UseGuards(JwtAuthGuard)
  account(@CurrentUser() user: AuthenticatedUser) {
    return this.launcherService.account(user.id)
  }

  // Phase 3B Part M -- Unified Blood Moon Account / game-readiness status,
  // distinct from the existing /launcher/account route above (Portal-local
  // profile + display characters). See launcher.service.ts's me()/
  // myCharacters() doc comments for why these are separate concepts.
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.launcherService.me(user)
  }

  @Get('me/characters')
  @UseGuards(JwtAuthGuard)
  myCharacters(@CurrentUser() user: AuthenticatedUser) {
    return this.launcherService.myCharacters(user)
  }

  // Launcher Phase L3 -- public, same trust level as /launcher/bootstrap.
  @Get('events')
  events() {
    return this.launcherService.events()
  }

  @Get('rankings')
  rankings(@Query('type') type?: string) {
    return this.launcherService.rankings(type)
  }
}
