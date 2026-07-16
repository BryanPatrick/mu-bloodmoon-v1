import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { WebSourceController } from './web-source.controller'
import { WebSourceService } from './web-source.service'

@Module({
  imports: [AuthModule],
  controllers: [WebSourceController],
  providers: [WebSourceService]
})
export class WebSourceModule {}
