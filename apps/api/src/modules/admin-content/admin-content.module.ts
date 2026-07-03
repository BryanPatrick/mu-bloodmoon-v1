import { Module } from '@nestjs/common'
import { DatabaseModule } from '../../database/database.module'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { AdminContentController } from './admin-content.controller'
import { AdminContentService } from './admin-content.service'

@Module({
  imports: [DatabaseModule, AuditModule, AuthModule],
  controllers: [AdminContentController],
  providers: [AdminContentService]
})
export class AdminContentModule {}
