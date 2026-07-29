import { Injectable } from '@nestjs/common'
import { AsyncLocalStorage } from 'node:async_hooks'

export type RequestContext = {
  correlationId: string
  actorUserId?: string
  actorRole?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  requestPath?: string
  requestMethod?: string
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContext>()

  run(context: RequestContext, next: () => void) {
    this.storage.run(context, next)
  }

  current() {
    return this.storage.getStore()
  }

  setActor(actor: { userId: string; role: string; sessionId?: string }) {
    const context = this.current()
    if (!context) return
    context.actorUserId = actor.userId
    context.actorRole = actor.role
    context.sessionId = actor.sessionId
  }

  correlationId() {
    return this.current()?.correlationId
  }
}
