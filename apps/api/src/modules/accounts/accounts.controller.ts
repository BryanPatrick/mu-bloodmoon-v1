import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AccountsService } from './accounts.service'
import type { AdminAccountsQuery, UpdateAccountPayload } from './accounts.types'

@Controller('admin/accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  list(@Query() query: AdminAccountsQuery) {
    return this.accountsService.adminList(query)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() payload: UpdateAccountPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.accountsService.updateAccount(id, payload, user)
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
}
