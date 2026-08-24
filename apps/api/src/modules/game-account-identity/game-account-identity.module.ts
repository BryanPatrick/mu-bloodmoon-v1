import { Module } from '@nestjs/common'
import { GameAccountIdentityService } from './game-account-identity.service'

@Module({
  providers: [GameAccountIdentityService],
  exports: [GameAccountIdentityService]
})
export class GameAccountIdentityModule {}
