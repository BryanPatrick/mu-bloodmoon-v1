import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../../../apps/api/src/app.module'

// Deliberately uses an application context instead of opening a TCP listener.
// This is a bundling/bootstrap feasibility probe, not a production adapter.
let bootstrap: Promise<void> | undefined

async function bootstrapCurrentApplicationGraph() {
  bootstrap ??= NestFactory.createApplicationContext(AppModule, {
    logger: false
  }).then(async (application) => {
    await application.close()
  })
  return bootstrap
}

export default {
  async fetch(): Promise<Response> {
    await bootstrapCurrentApplicationGraph()
    return Response.json({ ok: true, graph: 'current-api' })
  }
}
