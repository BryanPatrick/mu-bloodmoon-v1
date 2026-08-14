import { execSync } from 'node:child_process'

// Shared by every E2E spec that needs a real database: a dedicated,
// disposable MariaDB container -- never the shared dev database
// (bloodmoon-mysql), never production. Created by the caller's beforeAll,
// destroyed by its afterAll. Each spec picks its own container name so
// multiple spec files never collide if run concurrently.
//
// When Docker isn't available (e.g. this Windows dev machine), set
// E2E_LOCAL_MYSQL_URL to point at a disposable local MySQL/MariaDB instance
// instead. All spec files then share that single database sequentially
// (the suite already runs with --runInBand and every spec namespaces its
// own test data with a timestamp suffix), and stopDisposableDatabase is a
// no-op so the shared local database survives between spec files.

const sh = (command: string, options: Parameters<typeof execSync>[1] = {}) =>
  execSync(command, { stdio: 'pipe', ...options }).toString()

export type DisposableDatabase = {
  containerName: string
  databaseUrl: string
}

export async function startDisposableDatabase(containerName: string): Promise<DisposableDatabase> {
  if (process.env.E2E_LOCAL_MYSQL_URL) {
    return { containerName, databaseUrl: process.env.E2E_LOCAL_MYSQL_URL }
  }

  const dbName = 'bloodmoon_e2e'
  const dbUser = 'validator'
  const dbPassword = 'validator_pw'
  const dbRootPassword = 'validator_root_pw'

  try {
    sh(`docker rm -f ${containerName}`)
  } catch {
    /* fine if it didn't already exist */
  }
  sh(
    `docker run -d --name ${containerName} ` +
      `-e MARIADB_DATABASE=${dbName} -e MARIADB_USER=${dbUser} -e MARIADB_PASSWORD=${dbPassword} ` +
      `-e MARIADB_ROOT_PASSWORD=${dbRootPassword} -p 0:3306 mariadb:11`
  )
  const portOutput = sh(`docker port ${containerName} 3306/tcp`)
  const port = portOutput.trim().split(':').pop()!.trim()

  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      sh(`docker exec ${containerName} mariadb -u${dbUser} -p${dbPassword} ${dbName} -e "SELECT 1"`)
      return {
        containerName,
        databaseUrl: `mysql://${dbUser}:${dbPassword}@localhost:${port}/${dbName}`
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
  throw new Error(`Disposable e2e database (${containerName}) did not become ready in time`)
}

export function stopDisposableDatabase(containerName: string) {
  if (process.env.E2E_LOCAL_MYSQL_URL) {
    return
  }
  try {
    sh(`docker rm -f ${containerName}`)
  } catch {
    /* best effort cleanup */
  }
}
