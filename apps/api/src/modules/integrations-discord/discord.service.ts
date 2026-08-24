import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import type {
  DiscordEventDto,
  DiscordEventsResponse,
  DiscordNewsResponse,
  DiscordRankingsResponse,
  DiscordServerStatusResponse
} from './discord.contract'

// Phase 3B Part O-Q. Discord is a PUBLIC/CONTROLLED information consumer
// -- deliberately more conservative than LauncherService.bootstrap()
// (e.g. no online-player count here, even though the website shows one;
// see getServerStatus() below). Never queries D1/GameBridge/SQL directly
// (Part U) -- reuses the same Portal-side content sources
// (SiteSetting/KnowledgeEntry/AccountCharacter) apps/api already owns.
@Injectable()
export class DiscordService {
  constructor(private readonly prisma: PrismaService) {}

  async getServerStatus(): Promise<DiscordServerStatusResponse> {
    const rows = await this.prisma.siteSetting.findMany({
      where: {
        isPublic: true,
        status: 'PUBLISHED',
        category: { in: ['launcher', 'server'] },
        key: { in: ['launcher-server-status', 'launcher-maintenance'] }
      }
    })
    const settings = new Map(rows.map((r) => [r.key, r]))
    const statusRow = settings.get('launcher-server-status')
    const maintenanceValue = settings.get('launcher-maintenance')?.value as
      | { active?: boolean; message?: string }
      | undefined

    return {
      // Same MANUAL/LIVE/UNKNOWN discipline as LauncherService.bootstrap()
      // -- never fabricated as authoritative live telemetry (Part P).
      status: (statusRow?.value as string | undefined) ?? 'ONLINE',
      statusSource: statusRow ? 'MANUAL' : 'UNKNOWN',
      maintenance: {
        active: maintenanceValue?.active ?? false,
        message: maintenanceValue?.message ?? 'Nenhuma manutenção programada.'
      }
      // Deliberately no online player count: the only value available
      // (launcher-online-players) is the same admin-set MANUAL value the
      // website uses, not authoritative live telemetry -- Part P only
      // allows a public count "if authoritative and approved," which
      // this is not yet.
    }
  }

  async getEvents(): Promise<DiscordEventsResponse> {
    const entries = await this.prisma.knowledgeEntry.findMany({
      where: { kind: 'EVENT', status: 'PUBLISHED', scope: 'SEASON_6' },
      orderBy: [{ updatedAt: 'desc' }],
      take: 6
    })
    const [activeRaw, ...upcomingRaw] = entries
    return {
      activeEvent: activeRaw ? toEventDto(activeRaw, true) : null,
      upcoming: upcomingRaw.map((e) => toEventDto(e, false))
    }
  }

  // Part P/Q: public character name + class + a level/reset value only --
  // no account identity, no memb_guid/memb___id (this is Portal-side
  // AccountCharacter display data, not a real MU SQL ranking query; the
  // real Game Data Platform has no public leaderboard read path yet --
  // see docs/game-data/read-models/account-snapshot.md, rankings are
  // per-character within an authenticated account snapshot, not a public
  // aggregate query. This is an honest, real, currently-available
  // substitute, documented as such, not a stand-in for the real thing).
  async getRankings(): Promise<DiscordRankingsResponse> {
    const characters = await this.prisma.accountCharacter.findMany({
      orderBy: [{ masterReset: 'desc' }, { reset: 'desc' }, { level: 'desc' }],
      take: 10,
      select: { name: true, className: true, level: true, masterReset: true }
    })
    return {
      metric: 'masterReset',
      entries: characters.map((c, index) => ({
        position: index + 1,
        characterName: c.name,
        className: c.className,
        value: c.masterReset
      }))
    }
  }

  async getNews(): Promise<DiscordNewsResponse> {
    const entries = await this.prisma.knowledgeEntry.findMany({
      where: { kind: 'NEWS', status: 'PUBLISHED', scope: 'SEASON_6' },
      orderBy: [{ updatedAt: 'desc' }],
      take: 5
    })
    return {
      items: entries.map((e) => ({
        title: e.title,
        category: e.kind,
        summary: e.summary ?? '',
        publicationDate: e.updatedAt.toISOString(),
        websiteUrl: `https://mubloodmoon.com.br/noticias/${e.slug}`
      }))
    }
  }
}

// NOTE: normalizedData's real shape for EVENT-kind entries has not been
// confirmed against live data this phase (no EVENT rows exist in the
// local dev DB to check against) -- guideUrl/startsAt extraction here is
// a best-effort assumption, not a verified contract. Falls back to null
// safely either way; never throws if the shape differs.
function toEventDto(entry: { id: string; title: string; updatedAt: Date; normalizedData: unknown }, active: boolean): DiscordEventDto {
  const data = (entry.normalizedData ?? {}) as { guideUrl?: string; startsAt?: string }
  return {
    id: entry.id,
    name: entry.title,
    active,
    startsAt: data.startsAt ?? null,
    guideUrl: data.guideUrl ?? null
  }
}
