import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import { CharactersService } from './characters.service'
import type { CharacterActionPayload, CharacterQuery } from './characters.types'

@Controller('characters')
@UseGuards(JwtAuthGuard)
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Get()
  list(@Query() query: CharacterQuery, @CurrentUser() user: AuthenticatedUser) {
    return this.charactersService.list(user, query)
  }

  @Post(':id/actions')
  action(@Param('id') id: string, @Body() payload: CharacterActionPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.charactersService.action(id, payload, user)
  }
}
