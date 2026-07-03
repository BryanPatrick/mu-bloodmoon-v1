import 'reflect-metadata'
import helmet from 'helmet'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const webUrl = process.env.WEB_PUBLIC_URL || 'http://localhost:3000'
  const port = Number(process.env.API_PORT || 3333)

  app.enableCors({
    origin: [webUrl, 'http://127.0.0.1:3000', 'http://localhost:3000'],
    credentials: true
  })
  app.use(helmet())
  app.setGlobalPrefix('api')

  await app.listen(port)
  console.log(`Blood Moon API listening on http://localhost:${port}/api`)
}

void bootstrap()
