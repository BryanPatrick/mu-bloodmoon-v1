import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { AdminSupportController, PlayerTicketsController } from './support.controller'
import { SupportService } from './support.service'

@Module({ imports: [AuthModule, AuditModule], controllers: [PlayerTicketsController, AdminSupportController], providers: [SupportService] })
export class SupportModule {}
