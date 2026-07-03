import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AdminDashboardController } from './admin-dashboard.controller'
import { AdminDashboardService } from './admin-dashboard.service'

@Module({
  imports: [AuthModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService]
})
export class AdminDashboardModule {}
