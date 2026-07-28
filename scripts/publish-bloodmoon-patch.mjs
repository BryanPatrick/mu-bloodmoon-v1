import { createHash, createPrivateKey, sign } from 'node:crypto'
import {
  closeSync,
  cpSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'

const configPath = process.argv[2]
if (!configPath) throw new Error('Informe o arquivo JSON de configuração.')
const config = JSON.parse(readFileSync(resolve(configPath), 'utf8').replace(/^\uFEFF/, ''))
const clientRoot = resolve(config.clientDirectory)
const outputRoot = resolve(config.outputDirectory)
const channel = String(config.channel || 'test').toLowerCase()
const version = String(config.version)
const releaseRoot = join(outputRoot, channel, 'releases', version)
const filesRoot = join(outputRoot, channel, 'files')
const historyRoot = join(outputRoot, channel, 'history')
const exclusions = new Set([
  '.bloodmoon',
  'scripts - configs',
  'screenshots',
  ...(config.excludeDirectories || []).map(value => String(value).toLowerCase())
])
const excludedFiles = new Set([
  'bloodmoonlauncher.exe',
  'bloodmoonlauncherupdater.exe',
  'launcher.settings.json',
  ...(config.excludeFiles || []).map(value => String(value).toLowerCase())
])

const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  if (entry.isDirectory() && exclusions.has(entry.name.toLowerCase())) return []
  const absolute = join(directory, entry.name)
  return entry.isDirectory() ? walk(absolute) : [absolute]
})
const sha256 = path => {
  const hash = createHash('sha256')
  const descriptor = openSync(path, 'r')
  const buffer = Buffer.allocUnsafe(1024 * 1024)
  try {
    let bytesRead
    while ((bytesRead = readSync(descriptor, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, bytesRead))
    }
  } finally {
    closeSync(descriptor)
  }
  return hash.digest('hex').toUpperCase()
}
const normalize = path => path.split(sep).join('/')
const files = walk(clientRoot)
  .filter(path => !excludedFiles.has(basename(path).toLowerCase()))
  .map(path => ({
    path: normalize(relative(clientRoot, path)),
    sha256: sha256(path),
    size: statSync(path).size,
    source: path
  }))
  .sort((left, right) => left.path.toLowerCase().localeCompare(right.path.toLowerCase(), 'en'))

let previous = null
if (config.previousManifest && existsSync(resolve(config.previousManifest))) {
  previous = JSON.parse(readFileSync(resolve(config.previousManifest), 'utf8'))
}
const currentPaths = new Set(files.map(file => file.path.toLowerCase()))
const deleted = (previous?.files || [])
  .map(file => file.path)
  .filter(path => !currentPaths.has(String(path).toLowerCase()))
  .sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase(), 'en'))

mkdirSync(filesRoot, { recursive: true })
mkdirSync(releaseRoot, { recursive: true })
mkdirSync(historyRoot, { recursive: true })
for (const file of files) {
  const destination = join(filesRoot, ...file.path.split('/'))
  mkdirSync(dirname(destination), { recursive: true })
  if (!existsSync(destination) || sha256(destination) !== file.sha256) {
    cpSync(file.source, destination, { force: true })
  }
}

let launcher = null
if (config.launcherExecutable) {
  const launcherPath = resolve(config.launcherExecutable)
  const launcherName = `BloodMoonLauncher-${config.launcherVersion || version}.exe`
  const launcherDestination = join(outputRoot, channel, launcherName)
  cpSync(launcherPath, launcherDestination, { force: true })
  launcher = {
    version: String(config.launcherVersion || version),
    url: `${String(config.launcherBaseUrl).replace(/\/$/, '')}/${launcherName}`,
    sha256: sha256(launcherDestination),
    size: statSync(launcherDestination).size
  }
}

const manifest = {
  schemaVersion: 2,
  channel,
  version,
  publishedAt: new Date().toISOString(),
  baseUrl: `${String(config.baseUrl).replace(/\/$/, '')}/`,
  files: files.map(({ source, ...file }) => file),
  delete: deleted,
  launcher,
  contentSha256: '',
  signature: ''
}
const canonicalLines = [
  `schemaVersion=${manifest.schemaVersion}`,
  `channel=${manifest.channel}`,
  `version=${manifest.version}`,
  `baseUrl=${manifest.baseUrl}`,
  ...manifest.files.map(file =>
    `file=${file.path.toLowerCase()}|${file.sha256}|${file.size}`),
  ...manifest.delete.map(path => `delete=${path.toLowerCase()}`)
]
if (launcher) {
  canonicalLines.push(
    `launcher=${launcher.version}|${launcher.url}|${launcher.sha256}|${launcher.size}`)
}
manifest.contentSha256 = createHash('sha256')
  .update(canonicalLines.join('\n'), 'utf8')
  .digest('hex')
  .toUpperCase()
const privateKey = createPrivateKey(readFileSync(resolve(config.privateKeyPath), 'utf8'))
manifest.signature = sign(
  'sha256',
  Buffer.from(manifest.contentSha256, 'utf8'),
  privateKey
).toString('base64')

const serialized = `${JSON.stringify(manifest, null, 2)}\n`
writeFileSync(join(releaseRoot, 'manifest.json'), serialized)
writeFileSync(join(historyRoot, `manifest-${version}.json`), serialized)
writeFileSync(join(outputRoot, channel, 'manifest.next.json'), serialized)
writeFileSync(join(releaseRoot, 'release-summary.json'), `${JSON.stringify({
  channel,
  version,
  generatedAt: manifest.publishedAt,
  fileCount: files.length,
  deletedCount: deleted.length,
  totalBytes: files.reduce((sum, file) => sum + file.size, 0),
  manifestActivation: 'Publique files/ e o launcher primeiro; renomeie manifest.next.json para manifest.json por último.'
}, null, 2)}\n`)

console.log(JSON.stringify({
  channel,
  version,
  files: files.length,
  deleted: deleted.length,
  output: join(outputRoot, channel)
}, null, 2))
