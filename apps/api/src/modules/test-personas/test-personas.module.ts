import { DynamicModule, Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { GuildsModule } from '../guilds/guilds.module'
import { TestPersonasController } from './test-personas.controller'
import { TestPersonaService } from './test-personas.service'
import { isTestPersonaEnvironmentSafe } from './test-personas.env'

// register() is called once, synchronously, while app.module.ts's decorator
// is being evaluated -- i.e. before Nest builds anything. When the
// environment/database guard fails this returns a module with no
// controllers and no providers: TestPersonasController is never
// instantiated, so /api/test-personas/* is never a registered route. A
// request to it in that state 404s at Nest's router, the same as any
// unregistered path -- not a 403 from a guard that could be reverse-engineered
// or occasionally misconfigured, no route at all.
@Module({})
export class TestPersonasModule {
  static register(): DynamicModule {
    if (!isTestPersonaEnvironmentSafe()) {
      return { module: TestPersonasModule }
    }
    return {
      module: TestPersonasModule,
      imports: [AuthModule, GuildsModule],
      controllers: [TestPersonasController],
      providers: [TestPersonaService],
      exports: [TestPersonaService]
    }
  }
}
