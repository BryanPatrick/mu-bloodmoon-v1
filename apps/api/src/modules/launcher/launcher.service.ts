import { Injectable, NotFoundException } from '@nestjs/common'
import type { KnowledgeEntry, ReferenceAsset, SiteSetting } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { GameAccountIdentityService } from '../game-account-identity/game-account-identity.service'

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameAccountIdentity: GameAccountIdentityService
  ) {}

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

  // Phase 3B Part M/T -- Unified Blood Moon Account status, distinct from
  // account() above: account() is Portal-local display data
  // (AccountCharacter, an unrelated concept -- see
  // docs/game-data/legacy-web-intelligence/character.md's naming-collision
  // note). This resolves the real chain: Account.id ->
  // GameAccountIdentity.membGuid -> Game Data. Never exposes memb___id or
  // memb_guid itself (unified-account.md Part K).
  async me(user: AuthenticatedUser) {
    const identity = await this.gameAccountIdentity.findByAccountId(user.id)
    return {
      accountId: user.id,
      username: user.username,
      role: user.role,
      gameReady: GameAccountIdentityService.isGameReady(identity),
      provisioningStatus: identity?.provisioningStatus ?? ('NONE' as const)
    }
  }

  // No CREATE_GAME_ACCOUNT command exists yet (Phase 3C), so no real
  // GameAccountIdentity can reach ACTIVE today -- this honestly returns
  // an empty list for every account right now; that is correct current
  // behavior, not a stub standing in for one. membGuid resolution is
  // already correct; the Game Data Worker's per-account read route
  // (apps/game-data-worker/src/read.ts only exposes bridge status today)
  // is the remaining Phase-3C-adjacent wiring point.
  async myCharacters(user: AuthenticatedUser) {
    const identity = await this.gameAccountIdentity.findByAccountId(user.id)
    if (!GameAccountIdentityService.isGameReady(identity)) {
      return { gameReady: false, characters: [] as const }
    }
    return { gameReady: true, characters: [] as const }
  }
}
