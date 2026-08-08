import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import type {
  CommunityCommentPayload,
  CommunityPostPayload,
  CommunityProfilePayload,
  CommunityQuery,
  CommunityReactionPayload,
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

  @Get('feed/authenticated')
  @UseGuards(JwtAuthGuard)
  authenticatedFeed(@Query() query: CommunityQuery, @CurrentUser() user: AuthenticatedUser) {
    return this.community.feed(query, user)
  }

  @Get('profiles/:username')
  profile(@Param('username') username: string) {
    return this.community.publicProfile(username)
  }

  @Get('profiles/:username/relationship')
  @UseGuards(JwtAuthGuard)
  relationship(@Param('username') username: string, @CurrentUser() user: AuthenticatedUser) {
    return this.community.relationship(username, user)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.community.myProfile(user)
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Body() payload: CommunityProfilePayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.community.updateProfile(payload, user)
  }

  @Post('profiles/:username/follow')
  @UseGuards(JwtAuthGuard)
  follow(@Param('username') username: string, @CurrentUser() user: AuthenticatedUser) {
    return this.community.follow(username, user)
  }

  @Delete('profiles/:username/follow')
  @UseGuards(JwtAuthGuard)
  unfollow(@Param('username') username: string, @CurrentUser() user: AuthenticatedUser) {
    return this.community.unfollow(username, user)
  }

  @Post('profiles/:username/block')
  @UseGuards(JwtAuthGuard)
  block(@Param('username') username: string, @CurrentUser() user: AuthenticatedUser) {
    return this.community.block(username, user)
  }

  @Delete('profiles/:username/block')
  @UseGuards(JwtAuthGuard)
  unblock(@Param('username') username: string, @CurrentUser() user: AuthenticatedUser) {
    return this.community.unblock(username, user)
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  createPost(@Body() payload: CommunityPostPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.community.createPost(payload, user)
  }

  @Get('posts/:id')
  getPost(@Param('id') id: string) {
    return this.community.getPost(id)
  }

  @Get('posts/:id/authenticated')
  @UseGuards(JwtAuthGuard)
  getPostAuthenticated(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.community.getPost(id, user)
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

  @Get('posts/:id/comments')
  postComments(@Param('id') id: string, @Query() query: CommunityQuery) {
    return this.community.postComments(id, query)
  }

  @Get('posts/:id/comments/authenticated')
  @UseGuards(JwtAuthGuard)
  postCommentsAuthenticated(@Param('id') id: string, @Query() query: CommunityQuery, @CurrentUser() user: AuthenticatedUser) {
    return this.community.postComments(id, query, user)
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  removeComment(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.community.removeOwnComment(id, user)
  }

  @Patch('comments/:id')
  @UseGuards(JwtAuthGuard)
  updateComment(@Param('id') id: string, @Body() payload: CommunityCommentPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.community.updateOwnComment(id, payload, user)
  }

  @Post('reactions')
  @UseGuards(JwtAuthGuard)
  react(@Body() payload: CommunityReactionPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.community.toggleReaction(payload, user)
  }

  @Post('posts/:id/save')
  @UseGuards(JwtAuthGuard)
  save(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.community.toggleSave(id, user)
  }

  @Post('posts/:id/repost')
  @UseGuards(JwtAuthGuard)
  repost(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.community.toggleRepost(id, user)
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
