import { chmod } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { environment } from '@raycast/api'

const execFileAsync = promisify(execFile)
const binary = join(environment.assetsPath, 'spellcheck')

export async function spellcheck(text: string): Promise<string | false> {
  const trimmed = text.trim()
  if (!trimmed)
    return false

  try {
    await chmod(binary, 0o755)
    const { stdout } = await execFileAsync(binary, [trimmed], { timeout: 5000 })
    const corrected = stdout.trim()
    return corrected && corrected !== trimmed ? corrected : false
  }
  catch (error) {
    console.error(error)
    return false
  }
}
