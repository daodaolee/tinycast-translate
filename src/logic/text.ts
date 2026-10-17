const fonts = {
  plain: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-',
  small_caps: 'abcdefghijklmnopqrstuvwxyzᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘꞯʀꜱᴛᴜᴠᴡXʏᴢ-',
}

type FontNames = keyof typeof fonts

export function unicodeTransform(text: string, to: FontNames, from: FontNames = 'plain') {
  const fromFont = Array.from(fonts[from])
  const toFont = Array.from(fonts[to])
  return Array.from(text)
    .map((char) => {
      const index = fromFont.indexOf(char)
      return index >= 0 ? toFont[index] : char
    })
    .join('')
}
