import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { imageTooLarge } from '@dnd/shared'
import { status } from 'elysia'

const uploadDir = process.env.UPLOAD_DIR ?? './data/uploads'

const typeByExt: Record<string, string> = {
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export function uploadName(name: string) {
  return name.replace(/[^\w.()-]+/g, '_')
}

export async function writeUpload(filename: string, file: File) {
  await mkdir(uploadDir, { recursive: true })
  const storagePath = path.join(uploadDir, filename)
  await writeFile(storagePath, Buffer.from(await file.arrayBuffer()))
  return storagePath
}

export async function rejectUnlessImage(file: File, error: string, limitMb: number) {
  if (imageTooLarge(file, limitMb))
    return status(413, { error: `Файл больше ${limitMb} МБ` })
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (sniffImage(head))
    return null
  return status(422, { error })
}

export async function imageResponse(filePath: string) {
  const file = Bun.file(filePath)
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const ext = path.extname(filePath).slice(1).toLowerCase()
  return new Response(file, {
    headers: {
      'cache-control': 'private, no-cache',
      'content-type': sniffImage(head) ?? typeByExt[ext] ?? 'application/octet-stream',
    },
  })
}

function sniffImage(bytes: Uint8Array) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47)
    return 'image/png'
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF)
    return 'image/jpeg'
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)
    return 'image/gif'
  if (
    bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}
