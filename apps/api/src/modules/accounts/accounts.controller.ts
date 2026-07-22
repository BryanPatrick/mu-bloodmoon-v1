import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { permissionKeys } from '../auth/permissions'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AccountsService } from './accounts.service'
import type { AdminAccountsQuery, RevokeSessionsPayload, UpdateAccountPayload, UpdateAccountPermissionsPayload } from './accounts.types'

@Controller('admin/accounts')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @RequirePermissions(permissionKeys.adminAccountsView)
  list(@Query() query: AdminAccountsQuery, @CurrentUser() user: AuthenticatedUser) {
    return this.accountsService.adminList(query, user)
  }

  @Patch(':id')
  @RequirePermissions(permissionKeys.adminAccountsStatusManage)
  update(@Param('id') id: string, @Body() payload: UpdateAccountPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.accountsService.updateAccount(id, payload, user)
  }

  @Get(':id/permissions')
  @RequirePermissions(permissionKeys.adminRolesManage)
  permissions(@Param('id') id: string) {
    return this.accountsService.accountPermissions(id)
  }

  @Patch(':id/permissions')
  @RequirePermissions(permissionKeys.adminRolesManage)
  updatePermissions(@Param('id') id: string, @Body() payload: UpdateAccountPermissionsPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.accountsService.updateAccountPermissions(id, payload, user)
  }

  @Patch(':id/sessions/revoke')
  @RequirePermissions(permissionKeys.adminAccountsStatusManage)
  revokeSessions(@Param('id') id: string, @Body() payload: RevokeSessionsPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.accountsService.revokeAccountSessions(id, payload.reason, user)
  }
}

@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('profile')
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.accountsService.profile(user)
  }

  @Get('sessions')
  sessions(@CurrentUser() user: AuthenticatedUser) {
    return this.accountsService.ownSessions(user)
  }

  @Patch('sessions/revoke')
  revokeSessions(@Body() payload: RevokeSessionsPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.accountsService.revokeOwnSessions(payload.reason, user)
  }
}
