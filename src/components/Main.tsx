import type { ReactElement } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Action, ActionPanel, Icon, List, Toast, showToast } from '@raycast/api'
import { usePromise } from '@raycast/utils'
import type { LanguageCode } from '../data/languages'
import { canonicalLanguage, getLanguageName, languages, languagesByCode } from '../data/languages'
import { webDictionaries } from '../data/web-dictionaries'
import { targetLanguages, useDebouncedValue, useSystemSelection } from '../logic/hooks'
import { spellcheck } from '../logic/spellcheck'
import { unicodeTransform } from '../logic/text'
import { translateAll, translatorPageUrl } from '../logic/translator'
import { SpellcheckItem } from './SpellcheckItem'
import { TranslateDetail } from './TranslateDetail'

const langPattern = new RegExp(
  `[>:/](${Object.keys(languagesByCode).sort((a, b) => b.length - a.length).join('|')})$`,
  'i',
)

export function Main(): ReactElement {
  const [isShowingDetail, setIsShowingDetail] = useState(true)
  const [input, setInput] = useState('')
  const [selectedId, setSelectedId] = useState<string>()
  const [userLangFrom, setUserLangFrom] = useState<LanguageCode>()
  const systemSelection = useSystemSelection()

  const rawSourceText = input.trim() || systemSelection
  const parsed = useMemo(() => {
    const match = rawSourceText.match(langPattern)
    if (!match)
      return { text: rawSourceText.trim(), from: 'auto' as LanguageCode }

    return {
      text: rawSourceText.replace(langPattern, '').trim(),
      from: canonicalLanguage(match[1]) ?? 'auto' as LanguageCode,
    }
  }, [rawSourceText])

  const langFrom = userLangFrom ?? parsed.from
  const debouncedText = useDebouncedValue(parsed.text, 500)

  const { data: results, isLoading } = usePromise(
    translateAll,
    [debouncedText, langFrom, targetLanguages],
    {
      onError(error) {
        showToast({
          style: Toast.Style.Failure,
          title: '翻译失败',
          message: error instanceof Error ? error.message : String(error),
        })
      },
    },
  )

  const { data: correctedText } = usePromise(spellcheck, [debouncedText])

  useEffect(() => {
    setSelectedId(undefined)
  }, [results])

  const fromLangs = Array.from(new Set(results?.map(item => item.from)))
  const singleSource = fromLangs.length === 1
  const otherLanguages = languages.filter(lang => lang.code !== 'auto' && !targetLanguages.includes(lang.code))

  return (
    <List
      searchBarPlaceholder={systemSelection.replace(/\n/g, ' ') || '输入要翻译的文本'}
      searchBarAccessory={
        <List.Dropdown
          tooltip="源语言"
          value={langFrom}
          onChange={(value) => {
            setUserLangFrom(value === 'auto' ? undefined : value as LanguageCode)
          }}
        >
          <List.Dropdown.Item
            title={singleSource ? `自动（${getLanguageName(fromLangs[0])}）` : '自动'}
            value="auto"
          />
          <List.Dropdown.Section>
            {targetLanguages.map(lang => (
              <List.Dropdown.Item key={lang} title={getLanguageName(lang)} value={lang} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            {otherLanguages.map(lang => (
              <List.Dropdown.Item key={lang.code} title={lang.name} value={lang.code} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      searchText={input}
      onSearchTextChange={setInput}
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      throttle
      selectedItemId={selectedId}
      onSelectionChange={item => setSelectedId(item ?? undefined)}
    >
      {correctedText ? <SpellcheckItem text={parsed.text} corrected={correctedText} /> : null}
      {results?.map((item) => {
        const dictionaries = webDictionaries
          .filter(dictionary => (dictionary.sentence || !item.translated.includes(' '))
            && (!dictionary.enables || dictionary.enables.some(lang => targetLanguages.includes(lang)))
            && (item.from === dictionary.lang || item.to === dictionary.lang))
          .map((dictionary) => {
            const text = item.from === dictionary.lang ? item.original : item.translated
            return { title: dictionary.name, url: dictionary.url(text, item) }
          })
          .filter((dictionary): dictionary is { title: string, url: string } => Boolean(dictionary.url))

        const route = singleSource
          ? unicodeTransform(item.to.toUpperCase(), 'small_caps')
          : `${unicodeTransform(item.from.toUpperCase(), 'small_caps')} -> ${unicodeTransform(item.to.toUpperCase(), 'small_caps')}`

        return (
          <List.Item
            key={item.to}
            id={item.to}
            title={item.translated}
            accessories={[{ text: route }]}
            detail={<TranslateDetail item={item} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="复制译文" content={item.translated} />
                {dictionaries.map((dictionary, index) => (
                  <Action.OpenInBrowser
                    key={dictionary.title}
                    title={`在${dictionary.title}中打开`}
                    url={dictionary.url}
                    icon={Icon.Book}
                    shortcut={index === 0 ? { modifiers: ['cmd'], key: 'enter' } : undefined}
                  />
                ))}
                <Action.OpenInBrowser
                  title="在必应翻译中打开"
                  shortcut={{ modifiers: ['opt'], key: 'enter' }}
                  url={translatorPageUrl(item.from, item.to, item.original)}
                />
                <Action.OpenInBrowser
                  title="在必应中搜索"
                  url={`https://cn.bing.com/search?q=${encodeURIComponent(item.original)}`}
                />
                <Action
                  title={isShowingDetail ? '收起详情' : '展开详情'}
                  icon={Icon.Text}
                  onAction={() => setIsShowingDetail(value => !value)}
                />
              </ActionPanel>
            }
          />
        )
      })}
    </List>
  )
}
