import { Action, ActionPanel, Icon, List } from '@raycast/api'
import { formatDiff } from '../logic/diff'

export function SpellcheckItem({ text, corrected }: { text: string, corrected: string }) {
  const markdown = `###### 你是不是想输入\n\n${corrected}\n\n###### 差异\n\n${formatDiff(text, corrected)}`

  return (
    <List.Item
      id="spellcheck"
      icon={{
        value: Icon.QuestionMarkCircle,
        tooltip: '拼写检查',
      }}
      title={corrected}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="复制修正" content={corrected} />
        </ActionPanel>
      }
    />
  )
}
