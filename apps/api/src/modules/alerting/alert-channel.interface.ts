import type { SafeAlertPayload } from './alert-payload'

export interface AlertChannel {
  readonly name: string
  isEnabled(): boolean
  send(payload: SafeAlertPayload): Promise<void>
}
