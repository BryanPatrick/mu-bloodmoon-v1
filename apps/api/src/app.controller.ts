import { Controller, Get } from '@nestjs/common'

// Phase AA / Part 10 -- a deployment-rollback smoke test needs something
// to diff against. Previously GET / carried no version at all (confirmed
// during this phase's rollback audit), so there was nothing to compare
// before/after a rollback beyond "does it respond." package.json is never
// copied into dist/ by this build (confirmed empirically -- nest build
// emits only compiled .js), so reading it at runtime would silently
// always fail; APP_VERSION/APP_COMMIT are the real values, meant to be
// set by whatever process packages a release (deploy:cpanel:package or a
// future CI step) -- unset in local dev, where 'unknown' is honest and
// correct.
@Controller()
export class AppController {
  @Get()
  status() {
    return {
      name: 'Blood Moon API',
      status: 'online',
      version: process.env.APP_VERSION || 'unknown',
      commit: process.env.APP_COMMIT || null,
      timestamp: new Date().toISOString(),
      endpoints: {
        wiki: '/api/wiki/summary',
        equipmentSets: '/api/wiki/equipment/sets'
      }
    }
  }
}
