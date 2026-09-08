import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { AuthAbuseGuard } from '../auth/auth-abuse.guard'
import { AuthAbuseProtection } from '../auth/auth-abuse.decorator'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AccountDeletionRequestService } from './account-deletion-request.service'
import type { ExitFeedbackPayload } from './account-deletion.contract'

type RequestWithIp = {
  ip?: string
  socket: { remoteAddress?: string }
  get(name: string): string | undefined
}

function context(request: RequestWithIp) {
  return {
    ip: request.ip || request.socket.remoteAddress || null,
    device: request.get('user-agent')?.slice(0, 240) || null
  }
}

// Phase 15. Player-facing self-service deletion flow -- request/confirm/
// cancel/export/status. Deliberately separate from account-deletion.controller.ts
// (admin-only). `confirm` is intentionally NOT behind JwtAuthGuard, same
// as auth.controller.ts's password-recovery/reset -- the player may be
// acting from an emailed link with no active session; it's gated by
// AuthAbuseGuard (policy 'recovery', the closest existing fit for an
// unauthenticated token-based sensitive action) instead.
@Controller('account/deletion')
export class AccountDeletionRequestController {
  constructor(private readonly deletionRequest: AccountDeletionRequestService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.deletionRequest.myDeletionStatus(user)
  }

  @Post('request')
  @UseGuards(JwtAuthGuard)
  request(@CurrentUser() user: AuthenticatedUser, @Req() req: RequestWithIp, @Body('feedback') feedback?: ExitFeedbackPayload) {
    return this.deletionRequest.requestDeletion(user, context(req), feedback)
  }

  @Post('confirm')
  @AuthAbuseProtection({ policy: 'recovery' })
  @UseGuards(AuthAbuseGuard)
  confirm(@Body('token') token: string, @Req() req: RequestWithIp) {
    return this.deletionRequest.confirmDeletion(token, context(req))
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: AuthenticatedUser) {
    return this.deletionRequest.cancelDeletion(user)
  }

  @Get('export')
  @UseGuards(JwtAuthGuard)
  export(@CurrentUser() user: AuthenticatedUser) {
    return this.deletionRequest.exportMyData(user)
  }
}
