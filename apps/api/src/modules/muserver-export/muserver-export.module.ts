import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { MuServerExportController } from './muserver-export.controller'
import { MuServerExportService } from './muserver-export.service'

@Module({
  imports: [AuthModule],
  controllers: [MuServerExportController],
  providers: [MuServerExportService],
  exports: [MuServerExportService]
})
export class MuServerExportModule {}
