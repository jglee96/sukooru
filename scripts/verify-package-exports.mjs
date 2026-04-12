import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = dirname(scriptDir)
const packagesDir = join(workspaceRoot, 'packages')

const collectExportPaths = (value, paths = new Set()) => {
  if (typeof value === 'string' && value.startsWith('./')) {
    paths.add(value)
    return paths
  }

  if (!value || typeof value !== 'object') {
    return paths
  }

  for (const nestedValue of Object.values(value)) {
    collectExportPaths(nestedValue, paths)
  }

  return paths
}

const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(packagesDir, entry.name))

const missingEntries = []

for (const packageDir of packageDirs) {
  const packageJsonPath = join(packageDir, 'package.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const exportedPaths = collectExportPaths({
    main: packageJson.main,
    module: packageJson.module,
    types: packageJson.types,
    exports: packageJson.exports,
  })

  for (const relativePath of exportedPaths) {
    const absolutePath = join(packageDir, relativePath)
    if (!existsSync(absolutePath)) {
      missingEntries.push(`${packageJson.name}: ${relativePath}`)
    }
  }
}

if (missingEntries.length > 0) {
  console.error('Missing exported files:')
  for (const entry of missingEntries) {
    console.error(`- ${entry}`)
  }
  process.exit(1)
}

console.log('Verified package export files.')
