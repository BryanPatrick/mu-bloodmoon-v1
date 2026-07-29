import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common'
import type { NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CorrelationMiddleware } from './common/correlation.middleware'
import { DatabaseModule } from './database/database.module'
import { AccountsModule } from './modules/accounts/accounts.module'
import { AdminAuditModule } from './modules/admin-audit/admin-audit.module'
import { AdminContentModule } from './modules/admin-content/admin-content.module'
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module'
import { AdminObservabilityModule } from './modules/admin-observability/admin-observability.module'
import { AuthModule } from './modules/auth/auth.module'
import { CharactersModule } from './modules/characters/characters.module'
import { CommerceModule } from './modules/commerce/commerce.module'
import { WebSourceModule } from './modules/web-source/web-source.module'
import { MarketplaceModule } from './modules/marketplace/marketplace.module'
import { CommunityModule } from './modules/community/community.module'
import { MuServerExportModule } from './modules/muserver-export/muserver-export.module'
import { WikiModule } from './modules/wiki/wiki.module'
import { ContentModule } from './modules/content/content.module'
import { AppController } from './app.controller'
import { SupportModule } from './modules/support/support.module'
import { LauncherModule } from './modules/launcher/launcher.module'
import { ObservabilityModule } from './modules/observability/observability.module'
import { RoadmapModule } from './modules/roadmap/roadmap.module'
import { AdminTasksModule } from './modules/admin-tasks/admin-tasks.module'
import { AdminReportsModule } from './modules/admin-reports/admin-reports.module'

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
  'admin-content',
  'launcher',
  'observability',
  'roadmap',
  'admin-tasks',
  'admin-reports'
] as const

export type ApiModuleName = typeof apiModules[number]

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    DatabaseModule,
    ObservabilityModule,
    AuthModule,
    AccountsModule,
    AdminAuditModule,
    AdminContentModule,
    AdminDashboardModule,
    AdminObservabilityModule,
    CharactersModule,
    CommerceModule,
    WebSourceModule,
    MarketplaceModule,
    CommunityModule,
    MuServerExportModule,
    WikiModule,
    ContentModule,
    SupportModule,
    LauncherModule,
    RoadmapModule,
    AdminTasksModule,
    AdminReportsModule
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL })
  }
}
