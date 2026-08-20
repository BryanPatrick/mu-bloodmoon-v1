import type { Env as WorkerEnv } from '../src/env'

declare module 'cloudflare:test' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ProvidedEnv extends WorkerEnv {}
}
