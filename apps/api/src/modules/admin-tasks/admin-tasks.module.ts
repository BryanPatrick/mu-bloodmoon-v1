import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { AdminTasksController } from './admin-tasks.controller'
import { AdminTasksService } from './admin-tasks.service'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AdminTasksController],
  providers: [AdminTasksService],
  exports: [AdminTasksService]
})
export class AdminTasksModule {}
