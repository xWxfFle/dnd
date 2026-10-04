import { eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { db } from '../../db'
import { characters, scenes, tokens } from '../../db/schema'
import { imageResponse } from '../../lib/uploads'
import { publicCharacterParams, publicSceneParams, publicTokenParams } from '../params'

export const filesModule = new Elysia({ name: 'files' })
  .get('/scenes/:sceneId/image', async ({ params }) => {
    const [scene] = await db.select().from(scenes).where(eq(scenes.id, params.sceneId)).limit(1)
    if (!scene?.imagePath)
      return status(404, { error: 'Нет карты' })
    const file = Bun.file(scene.imagePath)
    if (!(await file.exists()))
      return status(404, { error: 'Файл карты не найден' })
    return imageResponse(scene.imagePath)
  }, {
    params: publicSceneParams,
  })
  .get('/tokens/:tokenId/image', async ({ params }) => {
    const [token] = await db.select().from(tokens).where(eq(tokens.id, params.tokenId)).limit(1)
    if (!token?.imagePath)
      return status(404, { error: 'Нет картинки' })
    const file = Bun.file(token.imagePath)
    if (!(await file.exists()))
      return status(404, { error: 'Файл картинки не найден' })
    return imageResponse(token.imagePath)
  }, {
    params: publicTokenParams,
  })
  .get('/characters/:characterId/avatar', async ({ params }) => {
    const [character] = await db.select().from(characters).where(eq(characters.id, params.characterId)).limit(1)
    if (!character?.avatarPath)
      return status(404, { error: 'Нет портрета' })
    const file = Bun.file(character.avatarPath)
    if (!(await file.exists()))
      return status(404, { error: 'Файл портрета не найден' })
    return imageResponse(character.avatarPath)
  }, {
    params: publicCharacterParams,
  })
