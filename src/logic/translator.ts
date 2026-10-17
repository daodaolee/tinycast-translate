import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { canonicalLanguage, type LanguageCode } from '../data/languages'
import type { TranslateResult } from '../types'

const execFileAsync = promisify(execFile)

const cache = new Map<string, TranslateResult>()
const CACHE_LIMIT = 1000

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

const TO_BING: Record<string, string> = {
  'zh-CN': 'zh-Hans',
  'zh-TW': 'zh-Hant',
  eo: 'epo',
  hmn: 'mww',
  jv: 'jav',
  mn: 'mn-Cyrl',
  no: 'nb',
  ny: 'nya',
  sr: 'sr-Cyrl',
  tl: 'fil',
  tg: 'tgk',
  yi: 'ydd',
}

const FROM_BING = Object.fromEntries(Object.entries(TO_BING).map(([ours, bing]) => [bing, ours]))
const UNSUPPORTED = new Set(['haw', 'gd'])

interface BingSession {
  ig: string
  iid: string
  key: string
  token: string
  expiresAt: number
}

let session: BingSession | undefined
let sessionTask: Promise<BingSession> | undefined
let requestCount = 0

export class TranslateError extends Error {
  constructor(message?: string | Error, name?: string) {
    if (message instanceof Error) {
      super(message.message)
      this.name = name || message.name
    }
    else {
      super(message)
      this.name = name || 'TranslateError'
    }
  }
}

function remember(key: string, result: TranslateResult) {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest)
      cache.delete(oldest)
  }
  cache.set(key, result)
}

function toBing(code: string) {
  if (code === 'auto')
    return 'auto-detect'
  if (UNSUPPORTED.has(code))
    throw new TranslateError(`必应翻译暂不支持这个语言（${code}）`)
  return TO_BING[code] ?? code
}

function fromBing(code: string): LanguageCode {
  const mapped = FROM_BING[code] ?? code
  return canonicalLanguage(mapped) ?? mapped as LanguageCode
}

export function translatorPageUrl(from: string, to: string, text: string) {
  const params = new URLSearchParams({
    from: toBing(from),
    to: toBing(to),
    text,
  })
  return `https://cn.bing.com/translator?${params}`
}

async function curl(args: string[]) {
  try {
    const { stdout } = await execFileAsync('/usr/bin/curl', [
      '-sS',
      '--max-time',
      '20',
      '-A',
      USER_AGENT,
      ...args,
    ], {
      encoding: 'utf8',
      maxBuffer: 4_000_000,
      timeout: 25_000,
    })
    return stdout
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const lines = message.split('\n').map(line => line.trim()).filter(Boolean)
    throw new TranslateError(lines[lines.length - 1] || '无法连接必应翻译')
  }
}

async function fetchSession() {
  const html = await curl(['-L', 'https://cn.bing.com/translator'])
  const ig = html.match(/IG:"([^"]+)"/)?.[1]
  const tokenMatch = html.match(/params_AbusePreventionHelper\s*=\s*\[(\d+),"([^"]+)",(\d+)\]/)
  const iid = html.match(/data-iid="(translator\.\d+)"/)?.[1] ?? 'translator.5023'
  if (!ig || !tokenMatch)
    throw new TranslateError('必应翻译的页面格式变了')

  const lifetime = Number(tokenMatch[3])
  return {
    ig,
    iid,
    key: tokenMatch[1],
    token: tokenMatch[2],
    expiresAt: Date.now() + (Number.isFinite(lifetime) ? lifetime : 30 * 60 * 1000),
  } satisfies BingSession
}

async function loadSession(force = false) {
  if (!force && session && session.expiresAt - Date.now() > 60_000)
    return session
  if (!force && sessionTask)
    return sessionTask

  const task = fetchSession()
  sessionTask = task
  try {
    session = await task
    return session
  }
  finally {
    if (sessionTask === task)
      sessionTask = undefined
  }
}

async function requestBing(text: string, from: string, to: string, forceSession: boolean) {
  const current = await loadSession(forceSession)
  const fromLang = toBing(from)
  const toLang = toBing(to)

  requestCount += 1
  const url = `https://cn.bing.com/ttranslatev3?isVertical=1&&IG=${current.ig}&IID=${current.iid}&SFX=${requestCount}`
  const payload = await curl([
    '-e',
    'https://cn.bing.com/translator',
    '-H',
    'Content-Type: application/x-www-form-urlencoded',
    '--data-urlencode',
    `fromLang=${fromLang}`,
    '--data-urlencode',
    `to=${toLang}`,
    '--data-urlencode',
    `text=${text}`,
    '--data-urlencode',
    `token=${current.token}`,
    '--data-urlencode',
    `key=${current.key}`,
    url,
  ])
  if (!payload.trim())
    throw new TranslateError('必应翻译没有返回结果')

  const data = JSON.parse(payload) as Array<{
    translations?: Array<{ text?: string }>
    detectedLanguage?: { language?: string }
  }> | { statusCode?: number }
  if (!Array.isArray(data))
    throw new TranslateError('必应翻译没有返回结果')

  const translated = data[0]?.translations?.[0]?.text?.trim() ?? ''
  if (!translated)
    throw new TranslateError('必应翻译没有返回结果')

  return {
    translated,
    detected: data[0]?.detectedLanguage?.language,
  }
}

export async function translate(text: string, from: LanguageCode, to: LanguageCode): Promise<TranslateResult> {
  if (!text) {
    return { original: text, translated: '', from, to }
  }

  const key = `${from}:${to}:${text}`
  const cached = cache.get(key)
  if (cached)
    return cached

  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await requestBing(text, from, to, attempt > 0)
      const translatedResult: TranslateResult = {
        original: text,
        translated: result.translated,
        from: from === 'auto' && result.detected ? fromBing(result.detected) : from,
        to,
      }
      remember(key, translatedResult)
      return translatedResult
    }
    catch (error) {
      lastError = error
      session = undefined
      if (error instanceof TranslateError && error.message.includes('暂不支持'))
        throw error
    }
  }

  if (lastError instanceof Error)
    throw new TranslateError(lastError)
  throw new TranslateError('翻译失败')
}

export async function translateAll(text: string, from: LanguageCode = 'auto', languages: LanguageCode[]) {
  if (!text || languages.length === 0)
    return []

  const result = (await Promise.all(languages.map(async to => translate(text, from, to)))).filter(item => item.translated)
  const fromLangs = new Set(result.map(item => item.from))
  if (fromLangs.size !== 1)
    return result

  return result.filter(item => item.from !== item.to && item.translated.trim().toLowerCase() !== item.original.trim().toLowerCase())
}
