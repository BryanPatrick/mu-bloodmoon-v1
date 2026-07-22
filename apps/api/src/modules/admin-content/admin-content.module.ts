import { Module } from '@nestjs/common'
import { DatabaseModule } from '../../database/database.module'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { AdminContentController } from './admin-content.controller'
import { AdminContentService } from './admin-content.service'
import { MediaController } from './media.controller'

@Module({
  imports: [DatabaseModule, AuditModule, AuthModule],
  controllers: [AdminContentController, MediaController],
  providers: [AdminContentService]
})
export class AdminContentModule {}
