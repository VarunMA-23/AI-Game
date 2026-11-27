import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const scanTargets = [
  join(root, 'src'),
  join(root, 'index.html'),
  join(root, 'public'),
  join(root, 'stores'),
]
const sourceExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.css',
  '.html',
  '.json',
  '.svg',
])
const dataExtensions = new Set(['.json', '.svg'])
const forbiddenPatterns = [
  { name: 'runtime fetch', expression: /\bfetch\s*\(/ },
  { name: 'XMLHttpRequest', expression: /\bXMLHttpRequest\b/ },
  { name: 'sendBeacon', expression: /\bsendBeacon\s*\(/ },
  { name: 'WebSocket', expression: /\bnew\s+WebSocket\s*\(/ },
]
const bannedClaimPatterns = [
  { name: 'FPS or frame time claim', expression: /\b(?:fps|frames?\s+per\s+second|frame\s*time)\b/i },
  { name: 'latency claim', expression: /\blastency\b/i },
  {
    name: 'speedup multiple',
    expression: /\b\d+(?:\.\d+)?\s*[x×]\s*(?:faster|speedup|speed-up)\b/i,
  },
  {
    name: 'battery-life figure',
    expression:
      /\b\d+(?:\.\d+)?\s*(?:h|hr|hrs|hour|hours|min|mins|minute|minutes)\s+(?:battery|runtime)\b/i,
  },
  {
    name: 'percentage improvement',
    expression: /\b\d+(?:\.\d+)?\s*%\s*(?:faster|better|improve|improvement|less|more)\b/i,
  },
  {
    name: 'benchmark figure',
    expression: /\bbenchmark(?:ed)?\s+(?:score|result|of)?\s*\d/i,
  },
]
const externalUrlPattern = /https?:\/\//

function collectFiles(target) {
  if (!existsSync(target)) {
    return []
  }
  if (!statSync(target).isDirectory()) {
    return [target]
  }

  return readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(target, entry.name)
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath]
  })
}

const files = scanTargets
  .flatMap(collectFiles)
  .filter((filePath) => sourceExtensions.has(extname(filePath)))
  .sort()

const violations = []

for (const filePath of files) {
  const source = readFileSync(filePath, 'utf8')
  const lines = source.split(/\r?\n/)
  const isDataFile = dataExtensions.has(extname(filePath))

  lines.forEach((line, index) => {
    if (!isDataFile) {
      for (const pattern of forbiddenPatterns) {
        if (pattern.expression.test(line)) {
          violations.push({
            filePath,
            line: index + 1,
            rule: pattern.name,
          })
        }
      }

      for (const pattern of bannedClaimPatterns) {
        if (pattern.expression.test(line)) {
          violations.push({
            filePath,
            line: index + 1,
            rule: pattern.name,
          })
        }
      }

      if (externalUrlPattern.test(line)) {
        violations.push({
          filePath,
          line: index + 1,
          rule: 'external URL',
        })
      }
    }
  })
}

if (violations.length > 0) {
  for (const violation of violations) {
    const location = relative(root, violation.filePath)
    console.error(
      `${location}:${violation.line} contains ${violation.rule}`,
    )
  }
  process.exit(1)
}

console.log(`Offline source check passed: ${files.length} files scanned.`)
