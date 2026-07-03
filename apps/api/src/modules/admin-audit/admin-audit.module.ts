import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AdminAuditController } from './admin-audit.controller'
import { AdminAuditService } from './admin-audit.service'

@Module({
  imports: [AuthModule],
  controllers: [AdminAuditController],
  providers: [AdminAuditService]
})
export class AdminAuditModule {}
