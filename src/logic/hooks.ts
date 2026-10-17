import { useEffect, useState } from 'react'
import { getPreferenceValues, getSelectedText } from '@raycast/api'
import type { LanguageCode } from '../data/languages'
import type { ExtensionPreferences } from '../types'

export const preferences = getPreferenceValues<ExtensionPreferences>()

export const targetLanguages = (() => {
  const langs = Object.entries(preferences)
    .filter(([key]) => key.startsWith('lang'))
    .sort(([key1], [key2]) => key1.localeCompare(key2))
    .map(([, value]) => value)
    .filter(value => value && value !== 'none')
  return Array.from(new Set(langs)) as LanguageCode[]
})()

export function useSystemSelection() {
  const [text, setText] = useState('')

  useEffect(() => {
    if (!preferences.getSystemSelection)
      return

    let cancelled = false
    getSelectedText()
      .then((selected) => {
        if (!cancelled)
          setText((selected ?? '').trim())
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  return text
}

export function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
