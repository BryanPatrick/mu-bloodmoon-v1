import 'reflect-metadata'
import helmet from 'helmet'
import express from 'express'
import { join, resolve } from 'node:path'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { SafeExceptionFilter } from './common/safe-exception.filter'
import './common/bigint-json'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0)
  if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops)
  }
  const webUrls = (
    process.env.WEB_PUBLIC_URLS ||
    process.env.WEB_PUBLIC_URL ||
    'http://localhost:3000'
  )
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
  const mediaDirectory = resolve(
    process.env.COMMUNITY_MEDIA_DIR || join(process.cwd(), 'storage', 'community-media')
  )
  app.use(
    `${globalPrefix ? `/${globalPrefix}` : ''}/media/community`,
    express.static(mediaDirectory, {
      dotfiles: 'deny',
      index: false,
      fallthrough: false,
      maxAge: '7d'
    })
  )
  const guildMediaDirectory = resolve(
    process.env.GUILD_MEDIA_DIR || join(process.cwd(), 'storage', 'guild-media')
  )
  app.use(
    `${globalPrefix ? `/${globalPrefix}` : ''}/media/guild`,
    express.static(guildMediaDirectory, {
      dotfiles: 'deny',
      index: false,
      fallthrough: false,
      maxAge: '7d'
    })
  )
  app.useGlobalFilters(app.get(SafeExceptionFilter))
  if (globalPrefix) {
    app.setGlobalPrefix(globalPrefix)
  }

  await app.listen(port)
  console.log(
    `Blood Moon API listening on http://localhost:${port}${globalPrefix ? `/${globalPrefix}` : ''}`
  )
}

void bootstrap()
