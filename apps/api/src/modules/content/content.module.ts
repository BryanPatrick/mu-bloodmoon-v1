import { Module } from '@nestjs/common'
import { DatabaseModule } from '../../database/database.module'
import { ContentController } from './content.controller'
import { ContentService } from './content.service'

@Module({
  imports: [DatabaseModule],
  controllers: [ContentController],
  providers: [ContentService]
})
export class ContentModule {}
