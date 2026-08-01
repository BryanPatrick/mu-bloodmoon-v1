import { Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { PublicContentQuery } from './content.types'

const positiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async entries(query: PublicContentQuery) {
    const page = positiveInt(query.page, 1)
    const pageSize = Math.min(positiveInt(query.pageSize, 24), 100)
    const where: Prisma.KnowledgeEntryWhereInput = {
      status: 'PUBLISHED',
      scope: 'SEASON_6',
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.search ? { OR: [{ title: { contains: query.search } }, { summary: { contains: query.search } }] } : {})
    }
    const [total, data] = await Promise.all([
      this.prisma.knowledgeEntry.count({ where }),
      this.prisma.knowledgeEntry.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { assets: { include: { asset: true }, orderBy: { sortOrder: 'asc' } } }
      })
    ])
    return { data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async entry(slug: string) {
    const entry = await this.prisma.knowledgeEntry.findFirst({
      where: { slug, status: 'PUBLISHED', scope: 'SEASON_6' },
      include: { assets: { include: { asset: true }, orderBy: { sortOrder: 'asc' } } }
    })
    if (!entry) throw new NotFoundException(`Published content not found: ${slug}`)
    return entry
  }

  async settings() {
    const rows = await this.prisma.siteSetting.findMany({
      where: { isPublic: true, status: 'PUBLISHED' },
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    })
    return Object.fromEntries(rows.map((row) => [row.key, row.value]))
  }
}
