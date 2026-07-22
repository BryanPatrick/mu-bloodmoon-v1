import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './database/database.module'
import { AccountsModule } from './modules/accounts/accounts.module'
import { AdminAuditModule } from './modules/admin-audit/admin-audit.module'
import { AdminContentModule } from './modules/admin-content/admin-content.module'
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module'
import { AuthModule } from './modules/auth/auth.module'
import { CharactersModule } from './modules/characters/characters.module'
import { CommerceModule } from './modules/commerce/commerce.module'
import { WebSourceModule } from './modules/web-source/web-source.module'
import { MarketplaceModule } from './modules/marketplace/marketplace.module'
import { MuServerExportModule } from './modules/muserver-export/muserver-export.module'
import { WikiModule } from './modules/wiki/wiki.module'
import { ContentModule } from './modules/content/content.module'
import { AppController } from './app.controller'
import { SupportModule } from './modules/support/support.module'

export const apiModules = [
  'auth',
  'accounts',
  'characters',
  'shop',
  'recharge',
  'audit',
  'references',
  'tickets',
  'game-integration',
  'web-source',
  'marketplace',
  'muserver-export',
  'wiki',
  'admin-content'
] as const

export type ApiModuleName = typeof apiModules[number]

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    DatabaseModule,
    AuthModule,
    AccountsModule,
    AdminAuditModule,
    AdminContentModule,
    AdminDashboardModule,
    CharactersModule,
    CommerceModule,
    WebSourceModule,
    MarketplaceModule,
    MuServerExportModule,
    WikiModule,
    ContentModule,
    SupportModule
  ]
})
export class AppModule {}
