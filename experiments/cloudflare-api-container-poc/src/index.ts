import { Container, getContainer } from '@cloudflare/containers'

export class BloodMoonApiContainer extends Container<Env> {
  defaultPort = 8080
  sleepAfter = '10m'
  entrypoint = ['node', 'runtime-probe.mjs']

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.enableInternet = true
    this.envVars = {
      NODE_ENV: 'test',
      PORT: '8080',
      DATABASE_URL: env.DATABASE_URL,
      JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET,
      JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
      TWO_FACTOR_ENCRYPTION_KEY: env.TWO_FACTOR_ENCRYPTION_KEY,
      BILLING_PII_ENCRYPTION_KEY: env.BILLING_PII_ENCRYPTION_KEY,
      SESSION_SECRET: env.SESSION_SECRET,
      CF_POC_CONTROL_TOKEN: env.CF_POC_CONTROL_TOKEN,
      SESSION_TTL_HOURS: '1',
      AUTH_CAPTCHA_TEST_BYPASS: '1',
      ACCOUNT_LIFECYCLE_BRIDGE_ENABLED: 'false',
      PAYMENT_RECONCILIATION_ENABLED: 'false',
      MERCADO_PAGO_PROVIDER_POLL_ENABLED: 'false',
      GAME_PROVISIONING_RECONCILIATION_ENABLED: 'false',
      VIP_SYNC_RECONCILIATION_ENABLED: 'false',
      VIP_DELIVERY_WORKER_ENABLED: 'false',
      ALERT_SWEEP_ENABLED: 'false',
      GAMEBRIDGE_HEARTBEAT_ALERT_ENABLED: 'false',
      REAL_MONEY_PAYMENTS_ENABLED: 'false',
      MARKETPLACE_ENABLED: 'false',
      GAME_ACCOUNT_PROVISIONING_ON_REGISTER: 'false'
    }
  }

  onStart() {
    console.log('Shadow container started')
  }

  onStop({ exitCode, reason }: { exitCode: number; reason: 'exit' | 'runtime_signal' }) {
    console.log('Shadow container stopped', { exitCode, reason })
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    if (url.pathname === '/__cf_poc/container-stop') {
      if (request.method !== 'POST' || request.headers.get('x-cf-poc-key') !== this.env.CF_POC_CONTROL_TOKEN) {
        return new Response('Not found', { status: 404 })
      }
      await this.stop('SIGTERM')
      return Response.json({ stopped: true })
    }
    await this.startAndWaitForPorts({
      ports: this.defaultPort,
      cancellationOptions: {
        instanceGetTimeoutMS: 60_000,
        portReadyTimeoutMS: 60_000,
        waitInterval: 500
      }
    })
    return super.fetch(request)
  }
}

interface Env {
  BLOOD_MOON_API: DurableObjectNamespace<BloodMoonApiContainer>
  DATABASE_URL: string
  JWT_ACCESS_SECRET: string
  JWT_REFRESH_SECRET: string
  TWO_FACTOR_ENCRYPTION_KEY: string
  BILLING_PII_ENCRYPTION_KEY: string
  SESSION_SECRET: string
  CF_POC_CONTROL_TOKEN: string
}

export default {
  fetch(request: Request, env: Env) {
    return getContainer(env.BLOOD_MOON_API).fetch(request)
  }
}
