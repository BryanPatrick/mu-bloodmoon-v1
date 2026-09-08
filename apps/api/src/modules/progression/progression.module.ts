import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { ProgressionConfigService } from './progression-config.service'
import { ProgressionController } from './progression.controller'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ProgressionController],
  providers: [ProgressionConfigService],
  exports: [ProgressionConfigService]
})
export class ProgressionModule {}
