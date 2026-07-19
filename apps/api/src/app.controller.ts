import { Controller, Get } from '@nestjs/common'

@Controller()
export class AppController {
  @Get()
  status() {
    return {
      name: 'Blood Moon API',
      status: 'online',
      timestamp: new Date().toISOString(),
      endpoints: {
        wiki: '/api/wiki/summary',
        equipmentSets: '/api/wiki/equipment/sets'
      }
    }
  }
}
