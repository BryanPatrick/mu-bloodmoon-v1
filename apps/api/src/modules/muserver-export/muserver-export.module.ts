import { Module } from '@nestjs/common'
import { MuServerExportController } from './muserver-export.controller'
import { MuServerExportService } from './muserver-export.service'

@Module({
  controllers: [MuServerExportController],
  providers: [MuServerExportService],
  exports: [MuServerExportService]
})
export class MuServerExportModule {}
