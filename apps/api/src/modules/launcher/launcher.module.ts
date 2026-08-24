import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { GameAccountIdentityModule } from '../game-account-identity/game-account-identity.module'
import { LauncherController } from './launcher.controller'
import { LauncherService } from './launcher.service'

@Module({
  imports: [AuthModule, GameAccountIdentityModule],
  controllers: [LauncherController],
  providers: [LauncherService]
})
export class LauncherModule {}
