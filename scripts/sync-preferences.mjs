import { readFile, writeFile } from 'node:fs/promises'

const pkg = JSON.parse(await readFile('./package.json', 'utf8'))
const languages = JSON.parse(await readFile('./src/data/languages.json', 'utf8'))

const languageOptions = Object.values(languages)
  .filter(lang => lang.code !== 'auto')
  .map(lang => ({ title: lang.name, value: lang.code }))

const defaults = ['zh-CN', 'en', 'none', 'none', 'none', 'none', 'none']

pkg.preferences = [
  {
    name: 'getSystemSelection',
    type: 'checkbox',
    default: true,
    required: true,
    label: '读取当前选中的文本',
    description: '打开命令时，自动翻译其他应用里选中的文字',
  },
  ...defaults.map((value, index) => {
    const optional = index > 0
    return {
      name: `lang${index + 1}`,
      type: 'dropdown',
      title: `目标语言 ${index + 1}`,
      description: optional
        ? `第 ${index + 1} 个翻译目标。选「-」表示不使用`
        : `第 ${index + 1} 个翻译目标`,
      data: optional ? [{ title: '-', value: 'none' }, ...languageOptions] : languageOptions,
      required: !optional,
      default: value,
    }
  }),
]

await writeFile('./package.json', `${JSON.stringify(pkg, null, 2)}\n`)
