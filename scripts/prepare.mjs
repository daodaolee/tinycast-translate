import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const assets = join(dirname(fileURLToPath(import.meta.url)), '../assets')

execFileSync('swiftc', ['-o', 'spellcheck', 'spellcheck.swift'], {
  cwd: assets,
  stdio: 'inherit',
})
