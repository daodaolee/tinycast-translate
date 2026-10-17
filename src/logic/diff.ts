import { diffChars } from 'diff'

export function formatDiff(from: string, to: string) {
  return diffChars(from, to)
    .filter(part => part.value)
    .map((part) => {
      const value = part.value.replace(/[\\`*_{}[\]()#+\-.!|]/g, '\\$&')
      if (part.added)
        return `**${value}**`
      if (part.removed)
        return `~~${value}~~`
      return value
    })
    .join('')
}
