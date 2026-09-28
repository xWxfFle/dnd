import { eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { db } from '../../db'
import { characters, scenes } from '../../db/schema'
import { publicCharacterParams, publicSceneParams } from '../params'

export const filesModule = new Elysia({ name: 'files' })
  .get('/scenes/:sceneId/image', async ({ params }) => {
    const [scene] = await db.select().from(scenes).where(eq(scenes.id, params.sceneId)).limit(1)
    if (!scene?.imagePath)
      return status(404, { error: 'Нет карты' })
    const file = Bun.file(scene.imagePath)
    if (!(await file.exists()))
      return status(404, { error: 'Файл карты не найден' })
    return file
  }, {
    params: publicSceneParams,
  })
  .get('/characters/:characterId/avatar', async ({ params }) => {
    const [character] = await db.select().from(characters).where(eq(characters.id, params.characterId)).limit(1)
    if (!character?.avatarPath)
      return status(404, { error: 'Нет портрета' })
    const file = Bun.file(character.avatarPath)
    if (!(await file.exists()))
      return status(404, { error: 'Файл портрета не найден' })
    return file
  }, {
    params: publicCharacterParams,
  })
