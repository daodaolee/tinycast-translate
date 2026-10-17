import type { ReactElement } from 'react'
import { Icon, List } from '@raycast/api'
import { usePromise } from '@raycast/utils'
import { getLanguageName } from '../data/languages'
import type { TranslateResult } from '../types'
import { translate } from '../logic/translator'

export function TranslateDetail({ item }: { item: TranslateResult }): ReactElement {
  const { data: translatedBack, isLoading } = usePromise(translate, [item.translated, item.to, item.from])
  const same = translatedBack
    ? translatedBack.translated.trim().toLowerCase() === item.original.trim().toLowerCase()
    : false

  let markdown = item.translated
  if (translatedBack && !same)
    markdown += `\n\n------\n\n${translatedBack.translated}`

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="源语言" text={`${getLanguageName(item.from)} [${item.from}]`} />
          <List.Item.Detail.Metadata.Label title="目标语言" text={`${getLanguageName(item.to)} [${item.to}]`} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="回译"
            text={isLoading ? '翻译中…' : same ? '一致' : '不一致'}
            icon={isLoading ? Icon.CircleProgress : same ? Icon.Checkmark : Icon.Info}
          />
        </List.Item.Detail.Metadata>
      }
    />
  )
}
