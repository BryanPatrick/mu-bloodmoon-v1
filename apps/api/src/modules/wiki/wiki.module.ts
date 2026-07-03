import { Module } from '@nestjs/common'
import { WikiController } from './wiki.controller'
import { WikiService } from './wiki.service'

@Module({
  controllers: [WikiController],
  providers: [WikiService]
})
export class WikiModule {}
