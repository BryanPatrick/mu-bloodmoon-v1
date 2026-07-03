import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { CharactersController } from './characters.controller'
import { CharactersService } from './characters.service'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [CharactersController],
  providers: [CharactersService]
})
export class CharactersModule {}
