import { Controller, Get, UseGuards } from '@nestjs/common'
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
}
