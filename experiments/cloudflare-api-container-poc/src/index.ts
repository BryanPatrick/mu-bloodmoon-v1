import { Container, getContainer } from '@cloudflare/containers'

export class BloodMoonApiContainer extends Container {
  defaultPort = 8080
  sleepAfter = '10m'
}

interface Env {
  BLOOD_MOON_API: DurableObjectNamespace<BloodMoonApiContainer>
}

export default {
  fetch(request: Request, env: Env) {
    return getContainer(env.BLOOD_MOON_API).fetch(request)
  }
}
