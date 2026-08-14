import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { GmController } from './gm.controller'
import { GmService } from './gm.service'

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [GmController],
  providers: [GmService],
  exports: [GmService]
})
export class GmModule {}
