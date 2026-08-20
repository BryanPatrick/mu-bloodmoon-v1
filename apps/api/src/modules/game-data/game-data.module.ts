import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { GameDataClient } from './game-data.client'
import { GameDataController } from './game-data.controller'

@Module({
  imports: [AuthModule],
  controllers: [GameDataController],
  providers: [GameDataClient],
  exports: [GameDataClient]
})
export class GameDataModule {}
