import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { CommerceController } from './commerce.controller'
import { CommerceService } from './commerce.service'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [CommerceController],
  providers: [CommerceService]
})
export class CommerceModule {}
