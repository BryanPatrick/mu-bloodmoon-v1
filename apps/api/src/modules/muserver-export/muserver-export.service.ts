import { Injectable, NotFoundException } from '@nestjs/common'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { MuServerExportQuery } from './muserver-export.types'

const defaultPageSize = 50
const maxPageSize = 250

type ExportFileName =
  | 'inventory'
  | 'items'
  | 'skills'
  | 'monsters'
  | 'monster-spawns'
  | 'maps-summary'
  | 'cash-shop-products'
  | 'event-item-bags'

type JsonObject = Record<string, unknown>

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function stringifyForSearch(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

@Injectable()
export class MuServerExportService {
  private readonly exportRoot = this.resolveExportRoot()

  summary() {
    return this.readJson<JsonObject>('summary.json')
  }

  cmsModules() {
    return this.readJson<JsonObject>('cms-modules.json')
  }

  list(fileName: ExportFileName, query: MuServerExportQuery) {
    const rows = this.readJson<unknown[]>(`${fileName}.json`)
    return this.paginate(rows, query)
  }

  filesByGroup(group: string, query: MuServerExportQuery) {
    const modules = this.cmsModules()
    const filesByGroup = modules.filesByGroup as Record<string, { files: unknown[] }> | undefined
    const groupData = filesByGroup?.[group]

    if (!groupData) {
      throw new NotFoundException(`MuServer export group not found: ${group}`)
    }

    return this.paginate(groupData.files, query)
  }

  private paginate(rows: unknown[], query: MuServerExportQuery) {
    const page = toPositiveInt(query.page, 1)
    const pageSize = Math.min(toPositiveInt(query.pageSize, defaultPageSize), maxPageSize)
    const search = query.search?.trim().toLowerCase()
    const filtered = search
      ? rows.filter((row) => stringifyForSearch(row).toLowerCase().includes(search))
      : rows
    const total = filtered.length
    const start = (page - 1) * pageSize
    const data = filtered.slice(start, start + pageSize)

    return {
      data,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  }

  private readJson<T>(fileName: string): T {
    const filePath = path.join(this.exportRoot, fileName)
    if (!existsSync(filePath)) {
      throw new NotFoundException(`MuServer export file not found: ${fileName}`)
    }

    return JSON.parse(readFileSync(filePath, 'utf8')) as T
  }

  private resolveExportRoot() {
    const explicit = process.env.MUSERVER_EXPORT_DIR
    if (explicit && existsSync(explicit)) return explicit

    let current = process.cwd()
    for (let i = 0; i < 8; i += 1) {
      const candidate = path.join(current, 'references', 'game-data', 'muserver-export')
      if (existsSync(candidate)) return candidate
      const parent = path.dirname(current)
      if (parent === current) break
      current = parent
    }

    return path.join(process.cwd(), 'references', 'game-data', 'muserver-export')
  }
}
