import type { LanguageCode } from './data/languages'

export type { LanguageCode }

export interface TranslateResult {
  original: string
  translated: string
  from: LanguageCode
  to: LanguageCode
}

export interface WebDictionary {
  name: string
  lang: LanguageCode
  /**
   * 只在用户配置了其中某个目标语言时显示。
   */
  enables?: LanguageCode[]
  /**
   * 是否支持整句。默认只对单词显示。
   */
  sentence?: boolean
  url: (text: string, result: TranslateResult) => string | void
}

export interface ExtensionPreferences {
  getSystemSelection: boolean
  lang1: string
  lang2: string
  lang3: string
  lang4: string
  lang5: string
  lang6: string
  lang7: string
}
