import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { AdminAuditService } from './admin-audit.service'
import type { AdminAuditQuery } from './admin-audit.contract'

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminAuditController {
  constructor(private readonly adminAuditService: AdminAuditService) {}

  @Get('events')
  list(@Query() query: AdminAuditQuery) {
    return this.adminAuditService.list(query)
  }
}
