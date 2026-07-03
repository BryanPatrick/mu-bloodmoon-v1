import { Controller, Get, Param, Query } from '@nestjs/common'
import { WikiService } from './wiki.service'
import type { WikiEntryQuery, WikiEquipmentQuery, WikiEquipmentSetQuery } from './wiki.types'

@Controller('wiki')
export class WikiController {
  constructor(private readonly wikiService: WikiService) {}

  @Get('summary')
  summary() {
    return this.wikiService.summary()
  }

  @Get('entries')
  entries(@Query() query: WikiEntryQuery) {
    return this.wikiService.entries(query)
  }

  @Get('characters')
  characters() {
    return this.wikiService.characters()
  }

  @Get('equipment')
  equipment(@Query() query: WikiEquipmentQuery) {
    return this.wikiService.equipment(query)
  }

  @Get('equipment/sets')
  equipmentSets(@Query() query: WikiEquipmentSetQuery) {
    return this.wikiService.equipmentSets(query)
  }

  @Get('equipment/missing-references')
  missingEquipmentReferences(@Query() query: WikiEquipmentSetQuery) {
    return this.wikiService.missingEquipmentReferences(query)
  }

  @Get('equipment/:key')
  equipmentDetail(@Param('key') key: string) {
    return this.wikiService.equipmentDetail(key)
  }
}
