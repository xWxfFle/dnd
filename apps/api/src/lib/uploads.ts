import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileType, status } from 'elysia'

const uploadDir = process.env.UPLOAD_DIR ?? './data/uploads'

export function uploadName(name: string) {
  return name.replace(/[^\w.()-]+/g, '_')
}

export async function writeUpload(filename: string, file: File) {
  await mkdir(uploadDir, { recursive: true })
  const storagePath = path.join(uploadDir, filename)
  await writeFile(storagePath, Buffer.from(await file.arrayBuffer()))
  return storagePath
}

export async function rejectUnlessImage(file: File, error: string) {
  try {
    if (await fileType(file, 'image'))
      return null
  }
  catch {
    return status(422, { error })
  }
  return status(422, { error })
}
