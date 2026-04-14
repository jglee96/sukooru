import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = dirname(scriptDir)
const packagesDir = join(workspaceRoot, 'packages')

const sizeBudgets = {
  '@sukooru/core': {
    packed: 12_000,
    unpacked: 57_000,
  },
  '@sukooru/react': {
    packed: 4_500,
    unpacked: 18_000,
  },
  '@sukooru/vue': {
    packed: 4_500,
    unpacked: 19_000,
  },
  '@sukooru/next': {
    packed: 4_000,
    unpacked: 16_000,
  },
  '@sukooru/nuxt': {
    packed: 3_500,
    unpacked: 11_000,
  },
  '@sukooru/svelte': {
    packed: 5_000,
    unpacked: 23_000,
  },
}

const formatBytes = (value) => `${(value / 1024).toFixed(1)} KB`

const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(packagesDir, entry.name))

const tempCacheDir = mkdtempSync(join(tmpdir(), 'sukooru-npm-cache-'))
const failures = []
const summaries = []

try {
  for (const packageDir of packageDirs) {
    const packageJsonPath = join(packageDir, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    const budget = sizeBudgets[packageJson.name]

    if (!budget) {
      failures.push(`Missing size budget for ${packageJson.name}.`)
      continue
    }

    const raw = execFileSync(
      'npm',
      ['--cache', tempCacheDir, 'pack', '--json', '--dry-run'],
      {
        cwd: packageDir,
        encoding: 'utf8',
      },
    )
    const [packResult] = JSON.parse(raw)
    const sourcemapFiles = packResult.files.filter((file) => file.path.endsWith('.map'))

    if (sourcemapFiles.length > 0) {
      failures.push(
        `${packageJson.name} still publishes sourcemaps: ${sourcemapFiles
          .map((file) => file.path)
          .join(', ')}`,
      )
    }

    if (packResult.size > budget.packed) {
      failures.push(
        `${packageJson.name} packed size ${formatBytes(packResult.size)} exceeds budget ${formatBytes(
          budget.packed,
        )}.`,
      )
    }

    if (packResult.unpackedSize > budget.unpacked) {
      failures.push(
        `${packageJson.name} unpacked size ${formatBytes(
          packResult.unpackedSize,
        )} exceeds budget ${formatBytes(budget.unpacked)}.`,
      )
    }

    summaries.push({
      name: packageJson.name,
      packed: packResult.size,
      packedBudget: budget.packed,
      unpacked: packResult.unpackedSize,
      unpackedBudget: budget.unpacked,
      fileCount: packResult.entryCount,
    })
  }
} finally {
  rmSync(tempCacheDir, { recursive: true, force: true })
}

for (const summary of summaries) {
  console.log(
    `${summary.name}: packed ${formatBytes(summary.packed)} / ${formatBytes(
      summary.packedBudget,
    )}, unpacked ${formatBytes(summary.unpacked)} / ${formatBytes(
      summary.unpackedBudget,
    )}, files ${summary.fileCount}`,
  )
}

if (failures.length > 0) {
  console.error('\nPackage distribution verification failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('\nVerified package distribution size budgets.')
