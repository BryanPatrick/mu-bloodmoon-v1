import 'reflect-metadata'
import helmet from 'helmet'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const webUrls = (process.env.WEB_PUBLIC_URLS || process.env.WEB_PUBLIC_URL || 'http://localhost:3000')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
  const port = Number(process.env.API_PORT || process.env.PORT || 3333)
  const globalPrefix = process.env.API_GLOBAL_PREFIX ?? 'api'

  app.enableCors({
    origin: Array.from(new Set([...webUrls, 'http://127.0.0.1:3000', 'http://localhost:3000'])),
    credentials: true
  })
  app.use(helmet())
  if (globalPrefix) {
    app.setGlobalPrefix(globalPrefix)
  }

  await app.listen(port)
  console.log(`Blood Moon API listening on http://localhost:${port}${globalPrefix ? `/${globalPrefix}` : ''}`)
}

void bootstrap()
