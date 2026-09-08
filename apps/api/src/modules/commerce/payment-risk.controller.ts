import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import type { PaymentRiskAction } from '@prisma/client'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { permissionKeys } from '../auth/permissions'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ChargebackCaseService } from './chargeback-case.service'
import { PaymentRiskService } from './payment-risk.service'

// PHASE P (2026-08-31), Parts 2/3/4/6 -- admin surface for the antifraud
// foundation and the formal chargeback case model. Kept as its own
// controller (not folded into CommerceController, already 450+ lines)
// under the same admin/finance/* route prefix every other finance-admin
// route already uses.
@Controller('admin/finance')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class PaymentRiskController {
  constructor(
    private readonly riskService: PaymentRiskService,
    private readonly chargebackCaseService: ChargebackCaseService
  ) {}

  @Get('risk-cases')
  @RequirePermissions(permissionKeys.adminRiskView)
  listRiskCases(@Query() query: { status?: string; accountId?: string; page?: string; pageSize?: string }) {
    return this.riskService.listCases(query)
  }

  @Get('risk-cases/:id')
  @RequirePermissions(permissionKeys.adminRiskView)
  riskCaseDetail(@Param('id') id: string) {
    return this.riskService.getCase(id)
  }

  @Post('risk-cases/:id/actions')
  @RequirePermissions(permissionKeys.adminRiskManage)
  applyRiskAction(@Param('id') id: string, @Body() payload: { action: PaymentRiskAction; reason: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.riskService.applyAction(id, payload.action, payload.reason, user)
  }

  @Post('risk-cases/actions/:actionId/lift')
  @RequirePermissions(permissionKeys.adminRiskManage)
  liftRiskAction(@Param('actionId') actionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.riskService.liftAction(actionId, user)
  }

  @Post('risk-cases/:id/resolve')
  @RequirePermissions(permissionKeys.adminRiskManage)
  resolveRiskCase(
    @Param('id') id: string,
    @Body() payload: { status: 'CLEARED' | 'CONFIRMED_FRAUD' | 'CLOSED'; resolution: string },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.riskService.resolveCase(id, payload.status, payload.resolution, user)
  }

  @Get('chargeback-cases')
  @RequirePermissions(permissionKeys.adminChargebackView)
  listChargebackCases(@Query() query: { status?: string; accountId?: string; page?: string; pageSize?: string }) {
    return this.chargebackCaseService.listCases(query)
  }

  @Get('chargeback-cases/:id')
  @RequirePermissions(permissionKeys.adminChargebackView)
  chargebackCaseDetail(@Param('id') id: string) {
    return this.chargebackCaseService.getCase(id)
  }

  @Patch('chargeback-cases/:id/notes')
  @RequirePermissions(permissionKeys.adminChargebackManage)
  updateChargebackNotes(@Param('id') id: string, @Body() payload: { reviewNotes: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.chargebackCaseService.updateReviewNotes(id, payload.reviewNotes, user)
  }

  @Post('chargeback-cases/:id/resolve')
  @RequirePermissions(permissionKeys.adminChargebackManage)
  resolveChargebackCase(
    @Param('id') id: string,
    @Body() payload: { status: 'CLEARED' | 'CONFIRMED_FRAUD' | 'CLOSED'; resolution: string },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.chargebackCaseService.resolveCase(id, payload.status, payload.resolution, user)
  }
}
