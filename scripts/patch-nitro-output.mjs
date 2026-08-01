import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const outputDir = path.resolve('apps/web/.output/server/chunks')
const files = []

async function collectFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(fullPath)
    } else if (entry.isFile() && entry.name.endsWith('.mjs')) {
      files.push(fullPath)
    }
  }
}

await collectFiles(outputDir)

let patchedFiles = 0
for (const filePath of files) {
  const source = await readFile(filePath, 'utf8')
  const patched = source.replace(/tailwindcss\/colors(?!\.js)/g, 'tailwindcss/colors.js')
  if (patched !== source) {
    await writeFile(filePath, patched)
    patchedFiles += 1
  }
}

console.log(`Nitro output checked: ${patchedFiles} file(s) patched.`)
