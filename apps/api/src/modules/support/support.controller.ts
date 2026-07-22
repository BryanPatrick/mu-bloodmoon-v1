import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import type { ModerationActionType, SupportTicketStatus } from '@prisma/client'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { PermissionsGuard } from '../auth/permissions.guard'
import { RequirePermissions } from '../auth/permissions.decorator'
import { permissionKeys } from '../auth/permissions'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { SupportService } from './support.service'

@Controller('account/tickets')
@UseGuards(JwtAuthGuard)
export class PlayerTicketsController {
  constructor(private readonly service: SupportService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.service.ownTickets(user) }
  @Post() create(@Body() payload: { subject?: string; category?: string; message?: string }, @CurrentUser() user: AuthenticatedUser) { return this.service.createTicket(payload, user) }
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@RequirePermissions(permissionKeys.adminAccountsStatusManage)
export class AdminSupportController {
  constructor(private readonly service: SupportService) {}
  @Get('tickets') tickets(@Query('status') status?: string) { return this.service.adminTickets(status) }
  @Patch('tickets/:id') updateTicket(@Param('id') id: string, @Body() payload: { status?: SupportTicketStatus; response?: string; reason?: string }, @CurrentUser() user: AuthenticatedUser) { return this.service.updateTicket(id, payload, user) }
  @Get('moderation') moderation(@Query('accountId') accountId: string | undefined, @CurrentUser() user: AuthenticatedUser) { return this.service.moderationList(accountId, user) }
  @Post('moderation') moderate(@Body() payload: { accountId?: string; type?: ModerationActionType; reason?: string; expiresAt?: string | null }, @CurrentUser() user: AuthenticatedUser) { return this.service.moderate(payload, user) }
}
