import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import type {
  CommunityCommentPayload,
  CommunityPostPayload,
  CommunityQuery,
  CommunityReportPayload
} from './community.contract'
import { CommunityService } from './community.service'

@Controller('community')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('feed')
  feed(@Query() query: CommunityQuery) {
    return this.community.feed(query)
  }

  @Get('profiles/:username')
  profile(@Param('username') username: string) {
    return this.community.publicProfile(username)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.community.myProfile(user)
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Body() payload: { displayName?: string, bio?: string, avatarUrl?: string, coverUrl?: string, isPublic?: boolean },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.community.updateProfile(payload, user)
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  createPost(@Body() payload: CommunityPostPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.community.createPost(payload, user)
  }

  @Patch('posts/:id')
  @UseGuards(JwtAuthGuard)
  updatePost(@Param('id') id: string, @Body() payload: CommunityPostPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.community.updateOwnPost(id, payload, user)
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  removePost(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.community.removeOwnPost(id, user)
  }

  @Post('posts/:id/comments')
  @UseGuards(JwtAuthGuard)
  comment(
    @Param('id') id: string,
    @Body() payload: CommunityCommentPayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.community.createComment(id, payload, user)
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  removeComment(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.community.removeOwnComment(id, user)
  }

  @Post('reactions')
  @UseGuards(JwtAuthGuard)
  react(@Body() payload: { postId?: string, commentId?: string, type?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.community.toggleReaction(payload, user)
  }

  @Post('reports')
  @UseGuards(JwtAuthGuard)
  report(@Body() payload: CommunityReportPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.community.report(payload, user)
  }

  @Get('quests')
  quests() {
    return this.community.quests()
  }

  @Post('quests/:id/join')
  @UseGuards(JwtAuthGuard)
  joinQuest(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.community.joinQuest(id, user)
  }
}
