import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { AdminReportsController } from './admin-reports.controller'
import { AdminReportsService } from './admin-reports.service'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AdminReportsController],
  providers: [AdminReportsService],
  exports: [AdminReportsService]
})
export class AdminReportsModule {}
