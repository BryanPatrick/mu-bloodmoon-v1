import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { MarketplaceController } from './marketplace.controller'
import { MarketplaceAdminController } from './marketplace-admin.controller'
import { MarketplaceAdminService } from './marketplace-admin.service'
import { MarketplaceService } from './marketplace.service'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [MarketplaceController, MarketplaceAdminController],
  providers: [MarketplaceService, MarketplaceAdminService]
})
export class MarketplaceModule {}
