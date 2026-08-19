import { Injectable, NotFoundException } from '@nestjs/common'
import type { KnowledgeEntry, ReferenceAsset, SiteSetting } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

type EntryWithAssets = KnowledgeEntry & {
  assets: Array<{ role: string; sortOrder: number; asset: ReferenceAsset }>
}

const settingValue = <T>(settings: Map<string, SiteSetting>, key: string, fallback: T): T => {
  const value = settings.get(key)?.value
  return value === undefined || value === null ? fallback : value as T
}

const firstImage = (entry: EntryWithAssets) =>
  entry.assets.find(({ asset }) => asset.kind === 'IMAGE' && asset.publicPath)?.asset.publicPath
  ?? entry.assets.find(({ asset }) => asset.kind === 'IMAGE')?.asset.sourceUrl
  ?? null

@Injectable()
export class LauncherService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrap() {
    const [settingRows, entries] = await Promise.all([
      this.prisma.siteSetting.findMany({
        where: {
          isPublic: true,
          status: 'PUBLISHED',
          category: { in: ['launcher', 'server', 'social'] }
        }
      }),
      this.prisma.knowledgeEntry.findMany({
        where: {
          kind: { in: ['NEWS', 'EVENT'] },
          status: 'PUBLISHED',
          scope: 'SEASON_6'
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 8,
        include: {
          assets: {
            include: { asset: true },
            orderBy: { sortOrder: 'asc' }
          }
        }
      })
    ])
    const settings = new Map(settingRows.map((row) => [row.key, row]))
    // No GameBridge integration exists yet (Global Portal Audit, P1.2) --
    // there is no live source for server status/online-player-count. MANUAL
    // means an admin explicitly set the value via the CMS; UNKNOWN means
    // nobody ever has, and the response is only the hardcoded fallback
    // below. LIVE is reserved for when a real game-server integration
    // exists -- never set today. Callers (the homepage, the launcher) must
    // not present this as confirmed live telemetry until that changes.
    const statusRow = settings.get('launcher-server-status')
    const statusSource: 'MANUAL' | 'LIVE' | 'UNKNOWN' = statusRow ? 'MANUAL' : 'UNKNOWN'
    const statusUpdatedAt = statusRow ? statusRow.updatedAt.toISOString() : null
    const news = entries.map((entry) => ({
      id: entry.id,
      slug: entry.slug,
      kind: entry.kind,
      title: entry.title,
      summary: entry.summary,
      imageUrl: firstImage(entry),
      publishedAt: entry.updatedAt,
      url: `https://mubloodmoon.com.br/noticias/${entry.slug}`
    }))

    return {
      generatedAt: new Date().toISOString(),
      server: {
        name: settingValue(settings, 'launcher-server-name', 'BloodMoon'),
        realm: settingValue(settings, 'launcher-realm-name', 'BloodMoon'),
        status: settingValue(settings, 'launcher-server-status', 'ONLINE'),
        statusSource,
        statusUpdatedAt,
        onlinePlayers: settingValue(settings, 'launcher-online-players', 0),
        maintenance: settingValue(settings, 'launcher-maintenance', {
          active: false,
          message: 'Nenhuma manutenção programada.'
        }),
        clientVersion: settingValue(settings, 'launcher-client-version', '1.0.0'),
        lastPatch: settingValue(settings, 'launcher-last-patch', null),
        manifestUrl: settingValue(
          settings,
          'launcher-manifest-url',
          'https://update.mubloodmoon.com.br/launcher/manifest.json'
        )
      },
      links: {
        website: settingValue(settings, 'launcher-website-url', 'https://mubloodmoon.com.br'),
        news: settingValue(settings, 'launcher-news-url', 'https://mubloodmoon.com.br/noticias'),
        discord: settingValue(settings, 'launcher-discord-url', 'https://discord.gg/'),
        whatsapp: settingValue(settings, 'launcher-whatsapp-url', 'https://wa.me/'),
        instagram: settingValue(settings, 'launcher-instagram-url', 'https://instagram.com/'),
        youtube: settingValue(settings, 'launcher-youtube-url', 'https://youtube.com/'),
        x: settingValue(settings, 'launcher-x-url', 'https://x.com/')
      },
      patchNotes: settingValue<string[]>(settings, 'launcher-patch-notes', []),
      featured: news[0] ?? null,
      news
    }
  }

  async account(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        currencies: {
          select: { currency: true, balance: true },
          orderBy: { currency: 'asc' }
        },
        characters: {
          select: {
            id: true,
            name: true,
            className: true,
            level: true,
            reset: true,
            masterReset: true,
            map: true,
            guild: true,
            status: true
          },
          orderBy: [
            { status: 'desc' },
            { masterReset: 'desc' },
            { reset: 'desc' },
            { level: 'desc' }
          ]
        }
      }
    })
    if (!account) throw new NotFoundException('Account not found')

    return {
      user: {
        id: account.id,
        username: account.username,
        name: account.name,
        email: account.email,
        role: account.role
      },
      currencies: account.currencies,
      activeCharacter: account.characters[0] ?? null,
      characters: account.characters
    }
  }
}
