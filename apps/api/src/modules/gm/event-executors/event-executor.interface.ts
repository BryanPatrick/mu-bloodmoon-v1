import type { GmEventExecutionMode } from '@prisma/client'

export type EventExecutionContext = {
  runId: string
  correlationId: string
  definitionId: string
  definitionKey: string
  executionMode: GmEventExecutionMode
}

// success:false must NEVER be paired with an origin that claims a real game
// action happened -- see GameBridgeEventExecutor's header comment. Callers
// (gm-events.service.ts) must not create/advance a run on a failed result.
export type EventExecutionResult = {
  origin: string
  success: boolean
  externalResult: unknown | null
  externalError: string | null
}

export interface EventExecutor {
  readonly name: string
  execute(context: EventExecutionContext): Promise<EventExecutionResult>
}

// Prepared shape for a future real GameBridge call -- not applied to
// anything yet, since PortalEventExecutor has no I/O to bound and
// GameBridgeEventExecutor never actually calls out (see its header comment).
// A real implementation reads these instead of hardcoding numbers.
export type BridgeCallPolicy = {
  timeoutMs: number
  maxRetries: number
  retryBackoffMs: number
}

export function bridgeCallPolicyFromEnv(): BridgeCallPolicy {
  const int = (name: string, fallback: number) => {
    const value = Number.parseInt(process.env[name] || '', 10)
    return Number.isFinite(value) && value > 0 ? value : fallback
  }
  return {
    timeoutMs: int('GAME_BRIDGE_TIMEOUT_MS', 5000),
    maxRetries: int('GAME_BRIDGE_MAX_RETRIES', 0),
    retryBackoffMs: int('GAME_BRIDGE_RETRY_BACKOFF_MS', 1000)
  }
}
