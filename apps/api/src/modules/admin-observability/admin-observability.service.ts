import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import type {
  AuditResult,
  OperationalEventSeverity,
  Prisma,
  SystemAlertStatus,
  SystemErrorSeverity,
  SystemErrorStatus,
  WorkLogResult
} from '@prisma/client'
import { createHash } from 'node:crypto'
import { RequestContextService } from '../../common/request-context.service'
import {
  redactSensitiveText,
  sanitizeSensitiveData,
  toSafeJson
} from '../../common/sensitive-data'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { permissionKeys } from '../auth/permissions'
import type {
  AlertUpdatePayload,
  ErrorUpdatePayload,
  ExportQuery,
  ObservabilityListQuery,
  RetentionPolicyPayload,
  WorkLogPayload
} from './admin-observability.contract'

const errorSeverities: SystemErrorSeverity[] = [
  'INFO',
  'WARNING',
  'ERROR',
  'CRITICAL'
]
const errorStatuses: SystemErrorStatus[] = [
  'NEW',
  'ACKNOWLEDGED',
  'INVESTIGATING',
  'WAITING',
  'RESOLVED',
  'IGNORED',
  'REOPENED'
]
const alertStatuses: SystemAlertStatus[] = [
  'OPEN',
  'ACKNOWLEDGED',
  'RESOLVED',
  'IGNORED'
]
const workResults: WorkLogResult[] = [
  'SUCCESS',
  'PARTIAL',
  'FAILURE',
  'CANCELLED'
]
const auditResults: AuditResult[] = [
  'SUCCESS',
  'FAILURE',
  'PARTIAL',
  'DENIED'
]
const operationalSeverities: OperationalEventSeverity[] = [
  'INFO',
  'WARNING',
  'ERROR',
  'CRITICAL'
]

const positiveInt = (value: string | undefined, fallback: number, max = 100) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, max)
    : fallback
}

const dateValue = (value: string | undefined) => {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Data invalida: ${value}`)
  }
  return parsed
}

const dateRange = (query: ObservabilityListQuery) => {
  const gte = dateValue(query.dateFrom)
  const lte = dateValue(query.dateTo)
  return gte || lte ? { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } : undefined
}

const pageValues = (query: ObservabilityListQuery) => {
  const page = positiveInt(query.page, 1, 100000)
  const pageSize = positiveInt(query.pageSize, 30, 200)
  return { page, pageSize, skip: (page - 1) * pageSize }
}

const enumValue = <T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  field: string
) => {
  if (!value) return undefined
  const normalized = value.toUpperCase() as T
  if (!allowed.includes(normalized)) {
    throw new BadRequestException(`${field} invalido.`)
  }
  return normalized
}

const hasPermission = (user: AuthenticatedUser, permission: string) =>
  user.permissions.includes('*') || user.permissions.includes(permission)

const canSeeTechnicalDetails = (user: AuthenticatedUser) =>
  user.role === 'SUPER_ADMIN' ||
  hasPermission(user, permissionKeys.adminAuditFullView)

const cleanForViewer = (value: unknown, user: AuthenticatedUser) =>
  sanitizeSensitiveData(value, {
    maskPersonalData: !canSeeTechnicalDetails(user)
  })

const csvCell = (value: unknown) => {
  const normalized =
    value === null || value === undefined
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)
  return `"${normalized.replace(/"/g, '""')}"`
}

const csv = (headers: string[], rows: unknown[][]) =>
  `\uFEFF${[
    headers.map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(','))
  ].join('\r\n')}`

@Injectable()
export class AdminObservabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly requestContext: RequestContextService
  ) {}

  async summary(user: AuthenticatedUser) {
    const [
      auditEvents,
      workLogs,
      operationalEvents,
      openErrors,
      criticalErrors,
      openAlerts
    ] = await Promise.all([
      this.prisma.auditEvent.count(),
      this.prisma.adminWorkLog.count(),
      this.prisma.operationalEvent.count(),
      this.prisma.systemError.count({
        where: {
          status: {
            in: ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'WAITING', 'REOPENED']
          }
        }
      }),
      this.prisma.systemError.count({
        where: {
          severity: 'CRITICAL',
          status: { notIn: ['RESOLVED', 'IGNORED'] }
        }
      }),
      this.prisma.systemAlert.count({
        where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } }
      })
    ])
    return {
      auditEvents,
      workLogs,
      operationalEvents,
      openErrors,
      criticalErrors,
      openAlerts,
      technicalDetails: canSeeTechnicalDetails(user)
    }
  }

  async auditEvents(query: ObservabilityListQuery, user: AuthenticatedUser) {
    const { page, pageSize, skip } = pageValues(query)
    const createdAt = dateRange(query)
    const result = enumValue(query.result, auditResults, 'Resultado')
    const search = query.search?.trim()
    const where: Prisma.AuditEventWhereInput = {
      ...(query.module ? { module: query.module } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.severity ? { severity: query.severity.toLowerCase() } : {}),
      ...(result ? { result } : {}),
      ...(query.entityType ? { targetType: query.entityType } : {}),
      ...(query.entityId ? { targetId: query.entityId } : {}),
      ...(query.actorUserId ? { actorId: query.actorUserId } : {}),
      ...(query.correlationId ? { correlationId: query.correlationId } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(search
        ? {
            OR: [
              { action: { contains: search } },
              { module: { contains: search } },
              { targetType: { contains: search } },
              { targetId: { contains: search } },
              { actorUsername: { contains: search } },
              { correlationId: { contains: search } }
            ]
          }
        : {})
    }
    const [items, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.auditEvent.count({ where })
    ])
    return {
      items: items.map((item) => ({
        ...item,
        beforeData: cleanForViewer(item.beforeData, user),
        afterData: cleanForViewer(item.afterData, user),
        metadata: cleanForViewer(item.metadata, user)
      })),
      total,
      page,
      pageSize
    }
  }

  async entityHistory(
    entityType: string,
    entityId: string,
    user: AuthenticatedUser
  ) {
    if (!entityType.trim() || !entityId.trim()) {
      throw new BadRequestException('Entidade e identificador sao obrigatorios.')
    }
    const items = await this.prisma.auditEvent.findMany({
      where: { targetType: entityType, targetId: entityId },
      orderBy: { createdAt: 'asc' },
      take: 500
    })
    return items.map((item, index) => ({
      ...item,
      version: index + 1,
      beforeData: cleanForViewer(item.beforeData, user),
      afterData: cleanForViewer(item.afterData, user),
      metadata: cleanForViewer(item.metadata, user)
    }))
  }

  async workLogs(query: ObservabilityListQuery, user: AuthenticatedUser) {
    const { page, pageSize, skip } = pageValues(query)
    const createdAt = dateRange(query)
    const result = enumValue(query.result, workResults, 'Resultado')
    const search = query.search?.trim()
    const where: Prisma.AdminWorkLogWhereInput = {
      ...(query.module ? { module: query.module } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.actorUserId ? { userId: query.actorUserId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.taskId ? { taskId: query.taskId } : {}),
      ...(query.correlationId ? { correlationId: query.correlationId } : {}),
      ...(result ? { result } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search } },
              { username: { contains: search } },
              { action: { contains: search } },
              { entityId: { contains: search } }
            ]
          }
        : {})
    }
    const [items, total] = await Promise.all([
      this.prisma.adminWorkLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.adminWorkLog.count({ where })
    ])
    return {
      items: items.map((item) => ({
        ...item,
        evidence: cleanForViewer(item.evidence, user)
      })),
      total,
      page,
      pageSize
    }
  }

  async createWorkLog(payload: WorkLogPayload, user: AuthenticatedUser) {
    const module = payload.module?.trim()
    const action = payload.action?.trim()
    const entityType = payload.entityType?.trim()
    const description = payload.description?.trim()
    if (!module || !action || !entityType || !description) {
      throw new BadRequestException(
        'Modulo, acao, entidade e descricao sao obrigatorios.'
      )
    }
    const startedAt = dateValue(payload.startedAt) || new Date()
    const completedAt = payload.completedAt
      ? dateValue(payload.completedAt)
      : null
    const result = enumValue(payload.result, workResults, 'Resultado') || 'SUCCESS'
    const log = await this.prisma.adminWorkLog.create({
      data: {
        userId: user.id,
        username: user.username,
        module,
        action,
        entityType,
        entityId: payload.entityId?.trim() || null,
        taskId: payload.taskId?.trim() || null,
        description: redactSensitiveText(description),
        startedAt,
        completedAt,
        durationMinutes:
          payload.durationMinutes ??
          (completedAt
            ? Math.max(
                0,
                Math.round(
                  (completedAt.getTime() - startedAt.getTime()) / 60000
                )
              )
            : null),
        evidence: toSafeJson(payload.evidence, { maskPersonalData: true }),
        result,
        correlationId: this.requestContext.correlationId()
      }
    })
    await this.audit.record({
      module: 'work',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: 'admin.work-log.created',
      targetType: 'AdminWorkLog',
      targetId: log.id,
      afterData: log,
      workDescription: `Registrou trabalho manual: ${redactSensitiveText(description)}.`
    })
    return log
  }

  async operationalEvents(query: ObservabilityListQuery, user: AuthenticatedUser) {
    const { page, pageSize, skip } = pageValues(query)
    const occurredAt = dateRange(query)
    const severity = enumValue(
      query.severity,
      operationalSeverities,
      'Severidade'
    )
    const search = query.search?.trim()
    const where: Prisma.OperationalEventWhereInput = {
      ...(query.module ? { module: query.module } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(severity ? { severity } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.correlationId ? { correlationId: query.correlationId } : {}),
      ...(occurredAt ? { occurredAt } : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search } },
              { eventType: { contains: search } },
              { entityId: { contains: search } },
              { correlationId: { contains: search } }
            ]
          }
        : {})
    }
    const [items, total] = await Promise.all([
      this.prisma.operationalEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.operationalEvent.count({ where })
    ])
    return {
      items: items.map((item) => ({
        ...item,
        data: cleanForViewer(item.data, user)
      })),
      total,
      page,
      pageSize
    }
  }

  async errors(query: ObservabilityListQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const lastOccurredAt = dateRange(query)
    const severity = enumValue(query.severity, errorSeverities, 'Severidade')
    const status = enumValue(query.status, errorStatuses, 'Status')
    const search = query.search?.trim()
    const where: Prisma.SystemErrorWhereInput = {
      ...(query.module ? { module: query.module } : {}),
      ...(severity ? { severity } : {}),
      ...(status ? { status } : {}),
      ...(query.assignedTo ? { assignedTo: query.assignedTo } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.taskId ? { taskId: query.taskId } : {}),
      ...(query.correlationId ? { correlationId: query.correlationId } : {}),
      ...(lastOccurredAt ? { lastOccurredAt } : {}),
      ...(search
        ? {
            OR: [
              { errorCode: { contains: search } },
              { publicMessage: { contains: search } },
              { internalMessage: { contains: search } },
              { requestPath: { contains: search } },
              { fingerprint: { contains: search } }
            ]
          }
        : {})
    }
    const [items, total] = await Promise.all([
      this.prisma.systemError.findMany({
        where,
        select: {
          id: true,
          module: true,
          severity: true,
          errorCode: true,
          publicMessage: true,
          correlationId: true,
          entityType: true,
          entityId: true,
          requestPath: true,
          requestMethod: true,
          environment: true,
          occurrenceCount: true,
          firstOccurredAt: true,
          lastOccurredAt: true,
          status: true,
          assignedTo: true,
          taskId: true,
          resolvedAt: true,
          updatedAt: true
        },
        orderBy: [{ severity: 'desc' }, { lastOccurredAt: 'desc' }],
        skip,
        take: pageSize
      }),
      this.prisma.systemError.count({ where })
    ])
    return { items, total, page, pageSize }
  }

  async error(id: string, user: AuthenticatedUser) {
    const error = await this.prisma.systemError.findUnique({
      where: { id },
      include: {
        occurrences: {
          orderBy: { occurredAt: 'desc' },
          take: 100
        },
        timeline: { orderBy: { createdAt: 'asc' } }
      }
    })
    if (!error) throw new NotFoundException('Erro nao encontrado.')
    const technical = canSeeTechnicalDetails(user)
    return {
      ...error,
      internalMessage: technical
        ? error.internalMessage
        : 'Detalhe tecnico protegido.',
      stackTrace: technical ? error.stackTrace : null,
      metadata: cleanForViewer(error.metadata, user),
      occurrences: error.occurrences.map((item) => ({
        ...item,
        ipAddress: technical ? item.ipAddress : null,
        userAgent: technical ? item.userAgent : null,
        metadata: cleanForViewer(item.metadata, user)
      })),
      timeline: error.timeline.map((item) => ({
        ...item,
        evidence: cleanForViewer(item.evidence, user)
      }))
    }
  }

  async updateError(
    id: string,
    payload: ErrorUpdatePayload,
    user: AuthenticatedUser
  ) {
    const current = await this.prisma.systemError.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('Erro nao encontrado.')
    const nextStatus =
      enumValue(payload.status, errorStatuses, 'Status') || current.status
    const now = new Date()
    const resolution = payload.resolution?.trim()
      ? redactSensitiveText(payload.resolution.trim())
      : null
    if (nextStatus === 'RESOLVED' && !resolution && !current.resolution) {
      throw new BadRequestException(
        'Informe a solucao antes de resolver o erro.'
      )
    }
    const description = redactSensitiveText(
      payload.investigation?.trim() ||
      payload.reason?.trim() ||
      `Status alterado de ${current.status} para ${nextStatus}.`
    )
    const updated = await this.prisma.$transaction(async (transaction) => {
      const record = await transaction.systemError.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(payload.assignedTo !== undefined
            ? { assignedTo: payload.assignedTo?.trim() || null }
            : {}),
          ...(payload.taskId !== undefined
            ? { taskId: payload.taskId?.trim() || null }
            : {}),
          ...(payload.resolution !== undefined ? { resolution } : {}),
          ...(nextStatus === 'RESOLVED'
            ? { resolvedBy: user.id, resolvedAt: now }
            : nextStatus === 'REOPENED'
              ? { resolvedBy: null, resolvedAt: null }
              : {})
        }
      })
      await transaction.systemErrorTimeline.create({
        data: {
          systemErrorId: id,
          actorUserId: user.id,
          actorUsername: user.username,
          type:
            nextStatus === 'RESOLVED'
              ? 'RESOLUTION'
              : payload.investigation
                ? 'INVESTIGATION'
                : 'STATUS_CHANGE',
          fromStatus: current.status,
          toStatus: nextStatus,
          description,
          evidence: toSafeJson(payload.evidence, { maskPersonalData: true })
        }
      })
      return record
    })
    await this.audit.record({
      module: 'errors',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action:
        nextStatus === 'RESOLVED'
          ? 'admin.error.resolved'
          : nextStatus === 'REOPENED'
            ? 'admin.error.reopened'
            : 'admin.error.updated',
      targetType: 'SystemError',
      targetId: id,
      beforeData: current,
      afterData: updated,
      reason: payload.reason || payload.investigation
        ? redactSensitiveText(payload.reason || payload.investigation || '')
        : null,
      workEvidence: payload.evidence,
      workDescription: `${user.username} tratou o erro ${id}: ${description}`
    })
    return this.error(id, user)
  }

  async alerts(query: ObservabilityListQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const status = enumValue(query.status, alertStatuses, 'Status')
    const severity = enumValue(query.severity, errorSeverities, 'Severidade')
    const createdAt = dateRange(query)
    const where: Prisma.SystemAlertWhereInput = {
      ...(query.module ? { module: query.module } : {}),
      ...(status ? { status } : {}),
      ...(severity ? { severity } : {}),
      ...(query.assignedTo ? { assignedTo: query.assignedTo } : {}),
      ...(query.correlationId ? { correlationId: query.correlationId } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search.trim() } },
              { message: { contains: query.search.trim() } },
              { alertType: { contains: query.search.trim() } }
            ]
          }
        : {})
    }
    const [items, total] = await Promise.all([
      this.prisma.systemAlert.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize
      }),
      this.prisma.systemAlert.count({ where })
    ])
    return { items, total, page, pageSize }
  }

  async updateAlert(
    id: string,
    payload: AlertUpdatePayload,
    user: AuthenticatedUser
  ) {
    const current = await this.prisma.systemAlert.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('Alerta nao encontrado.')
    const status =
      enumValue(payload.status, alertStatuses, 'Status') || current.status
    const now = new Date()
    const updated = await this.prisma.systemAlert.update({
      where: { id },
      data: {
        status,
        ...(payload.assignedTo !== undefined
          ? { assignedTo: payload.assignedTo?.trim() || null }
          : {}),
        ...(status === 'ACKNOWLEDGED'
          ? { acknowledgedBy: user.id, acknowledgedAt: now }
          : {}),
        ...(status === 'RESOLVED'
          ? { resolvedBy: user.id, resolvedAt: now }
          : {})
      }
    })
    await this.audit.record({
      module: 'alerts',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: 'admin.alert.updated',
      targetType: 'SystemAlert',
      targetId: id,
      beforeData: current,
      afterData: updated,
      reason: payload.reason ? redactSensitiveText(payload.reason) : null
    })
    return updated
  }

  retentionPolicies() {
    return this.prisma.observabilityRetentionPolicy.findMany({
      orderBy: { dataType: 'asc' }
    })
  }

  async updateRetentionPolicy(
    dataType: string,
    payload: RetentionPolicyPayload,
    user: AuthenticatedUser
  ) {
    if (
      payload.retentionDays !== undefined &&
      (!Number.isInteger(payload.retentionDays) || payload.retentionDays < 30)
    ) {
      throw new BadRequestException('A retencao minima e de 30 dias.')
    }
    const current =
      await this.prisma.observabilityRetentionPolicy.findUnique({
        where: { dataType }
      })
    if (!current) throw new NotFoundException('Politica nao encontrada.')
    const updated = await this.prisma.observabilityRetentionPolicy.update({
      where: { dataType },
      data: {
        ...(payload.retentionDays !== undefined
          ? { retentionDays: payload.retentionDays }
          : {}),
        ...(payload.enabled !== undefined ? { enabled: payload.enabled } : {}),
        updatedBy: user.id
      }
    })
    await this.audit.record({
      module: 'observability',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: 'admin.retention.updated',
      targetType: 'ObservabilityRetentionPolicy',
      targetId: current.id,
      beforeData: current,
      afterData: updated,
      reason: payload.reason ? redactSensitiveText(payload.reason) : null,
      severity: 'warning'
    })
    return updated
  }

  exports(query: ObservabilityListQuery, user: AuthenticatedUser) {
    return this.prisma.adminLogExport.findMany({
      where:
        user.role === 'SUPER_ADMIN'
          ? {}
          : { requestedBy: user.id },
      orderBy: { createdAt: 'desc' },
      take: positiveInt(query.pageSize, 100, 200)
    })
  }

  async exportCsv(query: ExportQuery, user: AuthenticatedUser) {
    const source = query.source || 'audit'
    let headers: string[]
    let rows: unknown[][]

    if (source === 'audit') {
      const response = await this.auditEvents(
        { ...query, page: '1', pageSize: '200' },
        user
      )
      headers = [
        'id',
        'data',
        'modulo',
        'acao',
        'entidade',
        'entidadeId',
        'ator',
        'resultado',
        'severidade',
        'correlationId'
      ]
      rows = response.items.map((item) => [
        item.id,
        item.createdAt,
        item.module,
        item.action,
        item.targetType,
        item.targetId,
        item.actorUsername,
        item.result,
        item.severity,
        item.correlationId
      ])
    } else if (source === 'work') {
      const response = await this.workLogs(
        { ...query, page: '1', pageSize: '200' },
        user
      )
      headers = [
        'id',
        'data',
        'usuario',
        'modulo',
        'acao',
        'descricao',
        'resultado',
        'tarefa',
        'correlationId'
      ]
      rows = response.items.map((item) => [
        item.id,
        item.createdAt,
        item.username,
        item.module,
        item.action,
        item.description,
        item.result,
        item.taskId,
        item.correlationId
      ])
    } else if (source === 'events') {
      const response = await this.operationalEvents(
        { ...query, page: '1', pageSize: '200' },
        user
      )
      headers = [
        'id',
        'data',
        'modulo',
        'evento',
        'descricao',
        'severidade',
        'entidade',
        'correlationId'
      ]
      rows = response.items.map((item) => [
        item.id,
        item.occurredAt,
        item.module,
        item.eventType,
        item.description,
        item.severity,
        `${item.entityType || ''}:${item.entityId || ''}`,
        item.correlationId
      ])
    } else if (source === 'errors') {
      const response = await this.errors({
        ...query,
        page: '1',
        pageSize: '200'
      })
      headers = [
        'id',
        'ultimaOcorrencia',
        'modulo',
        'codigo',
        'mensagem',
        'severidade',
        'status',
        'ocorrencias',
        'responsavel',
        'correlationId'
      ]
      rows = response.items.map((item) => [
        item.id,
        item.lastOccurredAt,
        item.module,
        item.errorCode,
        item.publicMessage,
        item.severity,
        item.status,
        item.occurrenceCount,
        item.assignedTo,
        item.correlationId
      ])
    } else {
      throw new BadRequestException('Fonte de exportacao invalida.')
    }

    const content = csv(headers, rows)
    const createdAt = new Date()
    const fileName = `blood-moon-${source}-${createdAt.toISOString().slice(0, 10)}.csv`
    const checksum = createHash('sha256').update(content).digest('hex')
    await this.prisma.adminLogExport.create({
      data: {
        requestedBy: user.id,
        requestedByName: user.username,
        source,
        filters: toSafeJson(query),
        status: 'COMPLETED',
        recordCount: rows.length,
        fileName,
        checksum,
        correlationId: this.requestContext.correlationId(),
        completedAt: createdAt,
        expiresAt: new Date(createdAt.getTime() + 7 * 86400000)
      }
    })
    await this.audit.record({
      module: 'observability',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: 'admin.logs.exported',
      targetType: 'AdminLogExport',
      afterData: { source, fileName, recordCount: rows.length, checksum }
    })
    return { content, fileName }
  }
}
