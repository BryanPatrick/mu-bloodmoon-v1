import { Controller, Get, Param, Query } from '@nestjs/common'
import { MuServerExportService } from './muserver-export.service'
import type { MuServerExportQuery } from './muserver-export.types'

@Controller('muserver-export')
export class MuServerExportController {
  constructor(private readonly exportService: MuServerExportService) {}

  @Get('summary')
  summary() {
    return this.exportService.summary()
  }

  @Get('cms-modules')
  cmsModules() {
    return this.exportService.cmsModules()
  }

  @Get('inventory')
  inventory(@Query() query: MuServerExportQuery) {
    return this.exportService.list('inventory', query)
  }

  @Get('items')
  items(@Query() query: MuServerExportQuery) {
    return this.exportService.list('items', query)
  }

  @Get('skills')
  skills(@Query() query: MuServerExportQuery) {
    return this.exportService.list('skills', query)
  }

  @Get('monsters')
  monsters(@Query() query: MuServerExportQuery) {
    return this.exportService.list('monsters', query)
  }

  @Get('monster-spawns')
  monsterSpawns(@Query() query: MuServerExportQuery) {
    return this.exportService.list('monster-spawns', query)
  }

  @Get('maps')
  maps(@Query() query: MuServerExportQuery) {
    return this.exportService.list('maps-summary', query)
  }

  @Get('cash-shop-products')
  cashShopProducts(@Query() query: MuServerExportQuery) {
    return this.exportService.list('cash-shop-products', query)
  }

  @Get('event-item-bags')
  eventItemBags(@Query() query: MuServerExportQuery) {
    return this.exportService.list('event-item-bags', query)
  }

  @Get('files/:group')
  filesByGroup(@Param('group') group: string, @Query() query: MuServerExportQuery) {
    return this.exportService.filesByGroup(group, query)
  }
}
