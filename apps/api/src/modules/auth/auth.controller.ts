import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import type { ChangePasswordRequest, LoginRequest, RegisterRequest } from './auth.contract'
import type { AuthenticatedUser } from './auth.types'
import { AuthService } from './auth.service'
import { CurrentUser } from './current-user.decorator'
import { JwtAuthGuard } from './jwt-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() payload: LoginRequest) {
    return this.authService.login(payload)
  }

  @Post('register')
  register(@Body() payload: RegisterRequest) {
    return this.authService.register(payload)
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Body() payload: ChangePasswordRequest, @CurrentUser() user: AuthenticatedUser) {
    return this.authService.changePassword(payload, user)
  }
}
