import { Injectable, NotFoundException } from '@nestjs/common'
import type { KnowledgeEntry, ReferenceAsset, SiteSetting } from '@prisma/client'
import { createHash } from 'node:crypto'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { GameAccountIdentityService } from '../game-account-identity/game-account-identity.service'

type EntryWithAssets = KnowledgeEntry & {
  assets: Array<{ role: string; sortOrder: number; asset: ReferenceAsset }>
}

// Launcher Foundation phase -- the fixed page shell is client-owned (see
// docs/launcher/runtime-architecture.md); this list only bounds how many
// remote social entries the bootstrap response will ever emit, so a CMS
// mistake (or a future integration adding a 6th network) can never grow the
// fixed-size social rail past what the approved layout has room for.
const MAX_SOCIAL_ITEMS = 5
const BOOTSTRAP_SCHEMA_VERSION = 1

export interface CampaignContent {
  enabled: boolean
  type: string | null
  title: string | null
  subtitle: string | null
  versionLabel: string | null
  imageUrl: string | null
  ctaLabel: string | null
  ctaUrl: string | null
}

export interface SocialLinkContent {
  id: string
  label: string
  url: string
  iconAssetId: string | null
  order: number
  enabled: boolean
}

export interface UtilityLinkContent {
  id: string
  label: string
  url: string
  enabled: boolean
}

export interface AssetManifestEntry {
  id: string
  url: string
  contentType: string
  hash: string
  size: number
  kind: 'NEWS_IMAGE' | 'EVENT_IMAGE' | 'SOCIAL_ICON'
}

const settingValue = <T>(settings: Map<string, SiteSetting>, key: string, fallback: T): T => {
  const value = settings.get(key)?.value
  return value === undefined || value === null ? fallback : (value as T)
}

const firstImage = (entry: EntryWithAssets) =>
  entry.assets.find(({ asset }) => asset.kind === 'IMAGE' && asset.publicPath)?.asset.publicPath ??
  entry.assets.find(({ asset }) => asset.kind === 'IMAGE')?.asset.sourceUrl ??
  null

const firstImageAsset = (entry: EntryWithAssets): ReferenceAsset | null =>
  entry.assets.find(({ asset }) => asset.kind === 'IMAGE')?.asset ?? null

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

    const campaign = this.buildCampaign(settings)
    const socials = await this.buildSocials(settings)
    const utilities = this.buildUtilities(settings)
    const assets = await this.buildAssetManifest(entries, socials)
    const contentVersion = this.computeContentVersion(settingRows, entries)

    return {
      schemaVersion: BOOTSTRAP_SCHEMA_VERSION,
      contentVersion,
      generatedAt: new Date().toISOString(),
      campaign,
      socials,
      utilities,
      assets,
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

  // Deterministic, cheap to compute on every request -- no separate stored
  // counter to keep in sync. Changes iff the underlying rows change (any
  // key/id or its updatedAt), so the Launcher can cheaply decide "nothing
  // changed, skip the download" without comparing full payloads.
  private computeContentVersion(settingRows: SiteSetting[], entries: EntryWithAssets[]): string {
    const parts = [
      ...settingRows.map((row) => `s:${row.key}:${row.updatedAt.toISOString()}`).sort(),
      ...entries.map((entry) => `e:${entry.id}:${entry.updatedAt.toISOString()}`).sort()
    ]
    return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
  }

  // Part F -- structure (which fields exist, where the card sits) is fixed
  // in the Launcher; only these values are remote. Reuses SiteSetting's
  // existing generic Json value column (key `launcher-campaign`) rather than
  // a new table -- see docs/launcher/remote-content.md's note on why a
  // second content system was rejected again this phase, same reasoning as
  // Phase 3B's remote-content-contract.md.
  private buildCampaign(settings: Map<string, SiteSetting>): CampaignContent {
    const raw = settings.get('launcher-campaign')?.value as Partial<CampaignContent> | undefined
    if (!raw || typeof raw !== 'object') {
      return {
        enabled: false,
        type: null,
        title: null,
        subtitle: null,
        versionLabel: null,
        imageUrl: null,
        ctaLabel: null,
        ctaUrl: null
      }
    }
    return {
      enabled: raw.enabled === true,
      type: typeof raw.type === 'string' ? raw.type : null,
      title: typeof raw.title === 'string' ? raw.title : null,
      subtitle: typeof raw.subtitle === 'string' ? raw.subtitle : null,
      versionLabel: typeof raw.versionLabel === 'string' ? raw.versionLabel : null,
      imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : null,
      ctaLabel: typeof raw.ctaLabel === 'string' ? raw.ctaLabel : null,
      ctaUrl: typeof raw.ctaUrl === 'string' ? raw.ctaUrl : null
    }
  }

  // Part G -- prefers the richer `launcher-social-links` JSON list (ordered,
  // enable-able, up to MAX_SOCIAL_ITEMS) when a CMS operator has set it;
  // falls back to synthesizing from the pre-existing flat URL keys so
  // nothing regresses for an install that never sets the new key. Either
  // way the response is hard-capped -- a CMS mistake can never grow the
  // fixed-size social rail past what the approved layout has room for.
  private async buildSocials(settings: Map<string, SiteSetting>): Promise<SocialLinkContent[]> {
    const raw = settings.get('launcher-social-links')?.value
    if (Array.isArray(raw)) {
      // Prisma's JsonArray is a recursive interface, not a plain array type
      // alias -- TS won't propagate a .filter() type predicate through it,
      // so normalize to unknown[] first.
      const items = raw as unknown as unknown[]
      return items
        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        .map((item, index) => ({
          id: typeof item.id === 'string' ? item.id : `social-${index}`,
          label: typeof item.label === 'string' ? item.label : '',
          url: typeof item.url === 'string' ? item.url : '',
          iconAssetId: typeof item.iconAssetId === 'string' ? item.iconAssetId : null,
          order: typeof item.order === 'number' ? item.order : index,
          enabled: item.enabled !== false
        }))
        .sort((a, b) => a.order - b.order)
        .slice(0, MAX_SOCIAL_ITEMS)
    }

    const fallback: Array<[string, string, string]> = [
      ['discord', 'Discord', 'launcher-discord-url'],
      ['whatsapp', 'WhatsApp', 'launcher-whatsapp-url'],
      ['instagram', 'Instagram', 'launcher-instagram-url'],
      ['youtube', 'YouTube', 'launcher-youtube-url'],
      ['x', 'X', 'launcher-x-url']
    ]
    return fallback
      .map(([id, label, key], order) => ({
        id,
        label,
        url: settingValue(settings, key, ''),
        iconAssetId: null,
        order,
        enabled: settingValue(settings, key, '').length > 0
      }))
      .slice(0, MAX_SOCIAL_ITEMS)
  }

  // Part H -- fixed set (SUPORTE/SITE/WIKI), remote URL per item. `SAIR`/
  // `ENTRAR` are a local auth action, never content, so they are not part of
  // this list. `launcher-wiki-url`/`launcher-support-url` are new keys (the
  // documented Part AC gap -- the old contract only had a website/news URL,
  // never a wiki or a support URL); reusing SiteSetting's existing Json
  // value column, not a new table.
  private buildUtilities(settings: Map<string, SiteSetting>): UtilityLinkContent[] {
    const entries: Array<[string, string, string]> = [
      ['support', 'SUPORTE', 'launcher-support-url'],
      ['site', 'SITE', 'launcher-website-url'],
      ['wiki', 'WIKI', 'launcher-wiki-url']
    ]
    return entries.map(([id, label, key]) => {
      const url = settingValue(settings, key, '')
      return { id, label, url, enabled: url.length > 0 }
    })
  }

  // Part I -- only assets already backed by a real ReferenceAsset row (with
  // a captured hash + size) get a manifest entry, so the Launcher can trust
  // every hash it's given. An image referenced only as a plain URL (e.g.
  // today's campaign.imageUrl) has no manifest entry yet and is fetched
  // without hash-based dedupe -- a documented, honest gap, not a silent
  // fabrication of a hash that was never actually computed.
  private async buildAssetManifest(
    entries: EntryWithAssets[],
    socials: SocialLinkContent[]
  ): Promise<AssetManifestEntry[]> {
    const manifest: AssetManifestEntry[] = []

    for (const entry of entries) {
      const asset = firstImageAsset(entry)
      if (!asset || !asset.sha1 || !asset.bytes) continue
      const url = asset.publicPath ?? asset.sourceUrl
      if (!url) continue
      manifest.push({
        id: asset.id,
        url,
        contentType: asset.mimeType ?? 'application/octet-stream',
        hash: asset.sha1,
        size: asset.bytes,
        kind: entry.kind === 'EVENT' ? 'EVENT_IMAGE' : 'NEWS_IMAGE'
      })
    }

    const iconAssetIds = socials.map((social) => social.iconAssetId).filter((id): id is string => !!id)
    if (iconAssetIds.length > 0) {
      const iconAssets = await this.prisma.referenceAsset.findMany({ where: { id: { in: iconAssetIds } } })
      for (const asset of iconAssets) {
        if (!asset.sha1 || !asset.bytes) continue
        const url = asset.publicPath ?? asset.sourceUrl
        if (!url) continue
        manifest.push({
          id: asset.id,
          url,
          contentType: asset.mimeType ?? 'application/octet-stream',
          hash: asset.sha1,
          size: asset.bytes,
          kind: 'SOCIAL_ICON'
        })
      }
    }

    return manifest
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

  // A newly provisioned account legitimately has no characters. The
  // identity can therefore be ACTIVE/game-ready while this list is empty.
  // A per-account Game Data read route can replace the empty list once
  // character ingestion is wired; absence of characters is not an error.
  async myCharacters(user: AuthenticatedUser) {
    const identity = await this.gameAccountIdentity.findByAccountId(user.id)
    if (!GameAccountIdentityService.isGameReady(identity)) {
      return { gameReady: false, characters: [] as const }
    }
    return { gameReady: true, characters: [] as const }
  }

  // Launcher Phase L3 -- the Events page needs a real active/upcoming list
  // and a monthly calendar; KnowledgeEntry (kind EVENT, already extended
  // with eventStartsAt/eventEndsAt/calendarEnabled this phase) is the real,
  // already-published source, same one GET /launcher/bootstrap's news list
  // already draws NEWS entries from. A dedicated route rather than folding
  // this into bootstrap -- events.contract.ts's integrations-discord module
  // deliberately keeps each consumer on its own dedicated read path rather
  // than a shared cross-cutting service (see discord.service.ts's own
  // getEvents/getRankings comments); this route follows that same,
  // already-established convention.
  async events() {
    const now = new Date()
    const entries = await this.prisma.knowledgeEntry.findMany({
      where: {
        kind: 'EVENT',
        status: 'PUBLISHED',
        scope: 'SEASON_6',
        launcherEnabled: true
      },
      orderBy: [{ eventStartsAt: 'asc' }],
      take: 40,
      include: {
        assets: { include: { asset: true }, orderBy: { sortOrder: 'asc' } }
      }
    })

    const toEventCard = (entry: (typeof entries)[number]) => ({
      id: entry.id,
      name: entry.title,
      shortDescription: entry.launcherSummary ?? entry.summary ?? '',
      startsAt: entry.eventStartsAt,
      endsAt: entry.eventEndsAt,
      recommendedLevel: entry.recommendedLevel,
      entryInfo: entry.entryInfo,
      bannerUrl: firstImage(entry as EntryWithAssets),
      guideUrl: entry.guideUrl
    })

    const active = entries.find(
      (entry) => entry.eventStartsAt && entry.eventStartsAt <= now && (!entry.eventEndsAt || entry.eventEndsAt >= now)
    )
    const upcoming = entries.filter((entry) => entry.id !== active?.id && entry.eventStartsAt && entry.eventStartsAt > now)
    const calendarEntries = entries.filter((entry) => entry.calendarEnabled && entry.eventStartsAt)

    return {
      activeEvent: active ? toEventCard(active) : null,
      upcoming: upcoming.slice(0, 10).map(toEventCard),
      calendar: calendarEntries.map((entry) => ({
        date: entry.eventStartsAt,
        name: entry.title,
        shortDescription: entry.launcherSummary ?? entry.summary ?? '',
        startsAt: entry.eventStartsAt,
        guideUrl: entry.guideUrl
      }))
    }
  }

  // Same honest substitute discord.service.ts's getRankings already uses
  // and documents: the real Game Data Platform has no public leaderboard
  // read path yet (docs/game-data/read-models/account-snapshot.md) -- this
  // is real, currently-available Portal-side AccountCharacter data, not a
  // stand-in presented as something it isn't. Public character name/class/
  // level/reset only -- no account identity, no memb_guid/memb___id.
  async rankings(rankingType?: string) {
    const orderBy =
      rankingType === 'level'
        ? [{ level: 'desc' as const }]
        : rankingType === 'resets'
          ? [{ reset: 'desc' as const }]
          : [{ masterReset: 'desc' as const }, { reset: 'desc' as const }, { level: 'desc' as const }]

    const characters = await this.prisma.accountCharacter.findMany({
      orderBy,
      take: 100,
      select: { name: true, className: true, level: true, reset: true, masterReset: true }
    })

    const valueFor = (c: (typeof characters)[number]) =>
      rankingType === 'level' ? c.level : rankingType === 'resets' ? c.reset : c.masterReset

    return {
      rankingType: rankingType || 'masterReset',
      availableRankingTypes: ['masterReset', 'resets', 'level'],
      entries: characters.map((c, index) => ({
        rank: index + 1,
        characterName: c.name,
        currentClass: c.className,
        level: c.level,
        value: valueFor(c)
      }))
    }
  }
}
