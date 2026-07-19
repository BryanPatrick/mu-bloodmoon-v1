import { Controller, Get, Param, Query } from '@nestjs/common'
import { ContentService } from './content.service'
import type { PublicContentQuery } from './content.types'

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('entries')
  entries(@Query() query: PublicContentQuery) {
    return this.contentService.entries(query)
  }

  @Get('entries/:slug')
  entry(@Param('slug') slug: string) {
    return this.contentService.entry(slug)
  }

  @Get('settings')
  settings() {
    return this.contentService.settings()
  }
}
