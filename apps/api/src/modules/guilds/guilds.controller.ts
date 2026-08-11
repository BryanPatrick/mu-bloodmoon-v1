import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ThrottlerGuard } from '@nestjs/throttler'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import { GuildsService } from './guilds.service'
import type {
  GuildJoinDecisionPayload,
  GuildJoinPayload,
  GuildMemberKickPayload,
  GuildMemberRolePayload,
  GuildProjectPayload,
  GuildProjectUpdatePayload,
  GuildQuery,
  GuildRequestPayload,
  GuildRequestUpdatePayload,
  GuildUpdatePayload
} from './guilds.contract'

@Controller('guilds')
export class GuildsController {
  constructor(private readonly guilds: GuildsService) {}

  @Get()
  directory(@Query() query: GuildQuery) {
    return this.guilds.directory(query)
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.guilds.mine(user)
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string) {
    return this.guilds.bySlug(slug)
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard)
  update(@Param('slug') slug: string, @Body() payload: GuildUpdatePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.guilds.updateGuild(slug, payload, user)
  }

  @Get(':slug/members')
  members(@Param('slug') slug: string, @Query() query: GuildQuery) {
    return this.guilds.members(slug, query)
  }

  @Get(':slug/requests')
  requests(@Param('slug') slug: string, @Query() query: GuildQuery) {
    return this.guilds.requests(slug, query)
  }

  @Get(':slug/projects')
  projects(@Param('slug') slug: string, @Query() query: GuildQuery) {
    return this.guilds.projects(slug, query)
  }

  @Get(':slug/treasury')
  treasury(@Param('slug') slug: string) {
    return this.guilds.treasury(slug)
  }

  @Get(':slug/vault')
  vault(@Param('slug') slug: string) {
    return this.guilds.vault(slug)
  }

  @Post(':slug/emblem')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { files: 1, fileSize: 8 * 1024 * 1024 } }))
  uploadEmblem(@Param('slug') slug: string, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: AuthenticatedUser) {
    if (!file) throw new BadRequestException('Selecione uma imagem válida.')
    return this.guilds.uploadEmblem(slug, file, user)
  }

  @Post(':slug/banner')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { files: 1, fileSize: 8 * 1024 * 1024 } }))
  uploadBanner(@Param('slug') slug: string, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: AuthenticatedUser) {
    if (!file) throw new BadRequestException('Selecione uma imagem válida.')
    return this.guilds.uploadBanner(slug, file, user)
  }

  @Post(':slug/join')
  @UseGuards(JwtAuthGuard)
  join(@Param('slug') slug: string, @Body() payload: GuildJoinPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.guilds.join(slug, payload, user)
  }

  @Get(':slug/join-requests')
  @UseGuards(JwtAuthGuard)
  joinRequests(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.guilds.joinRequests(slug, user)
  }

  @Post(':slug/join-requests/:id/approve')
  @UseGuards(JwtAuthGuard)
  approveJoinRequest(@Param('slug') slug: string, @Param('id') id: string, @Body() payload: GuildJoinDecisionPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.guilds.approveJoinRequest(slug, id, payload, user)
  }

  @Post(':slug/join-requests/:id/reject')
  @UseGuards(JwtAuthGuard)
  rejectJoinRequest(@Param('slug') slug: string, @Param('id') id: string, @Body() payload: GuildJoinDecisionPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.guilds.rejectJoinRequest(slug, id, payload, user)
  }

  @Delete(':slug/members/me')
  @UseGuards(JwtAuthGuard)
  leave(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.guilds.leave(slug, user)
  }

  @Patch(':slug/members/:id/role')
  @UseGuards(JwtAuthGuard)
  updateMemberRole(@Param('slug') slug: string, @Param('id') id: string, @Body() payload: GuildMemberRolePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.guilds.updateMemberRole(slug, id, payload, user)
  }

  @Delete(':slug/members/:id')
  @UseGuards(JwtAuthGuard)
  kickMember(@Param('slug') slug: string, @Param('id') id: string, @Body() payload: GuildMemberKickPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.guilds.kickMember(slug, id, payload, user)
  }

  @Post(':slug/requests')
  @UseGuards(JwtAuthGuard)
  createRequest(@Param('slug') slug: string, @Body() payload: GuildRequestPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.guilds.createRequest(slug, payload, user)
  }

  @Patch(':slug/requests/:id')
  @UseGuards(JwtAuthGuard)
  updateRequest(@Param('slug') slug: string, @Param('id') id: string, @Body() payload: GuildRequestUpdatePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.guilds.updateRequest(slug, id, payload, user)
  }

  @Delete(':slug/requests/:id')
  @UseGuards(JwtAuthGuard)
  cancelRequest(@Param('slug') slug: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.guilds.cancelRequest(slug, id, user)
  }

  @Post(':slug/projects')
  @UseGuards(JwtAuthGuard)
  createProject(@Param('slug') slug: string, @Body() payload: GuildProjectPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.guilds.createProject(slug, payload, user)
  }

  @Patch(':slug/projects/:id')
  @UseGuards(JwtAuthGuard)
  updateProject(@Param('slug') slug: string, @Param('id') id: string, @Body() payload: GuildProjectUpdatePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.guilds.updateProject(slug, id, payload, user)
  }

  @Delete(':slug/projects/:id')
  @UseGuards(JwtAuthGuard)
  cancelProject(@Param('slug') slug: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.guilds.cancelProject(slug, id, user)
  }
}
