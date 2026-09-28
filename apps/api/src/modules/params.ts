import { z } from 'zod'

export const errorSchema = z.object({ error: z.string() })

export const idParams = z.object({ id: z.uuid() })

export const inviteParams = z.object({ code: z.string().min(1) })

export const characterParams = z.object({
  id: z.uuid(),
  characterId: z.uuid(),
})

export const sceneParams = z.object({
  id: z.uuid(),
  sceneId: z.uuid(),
})

export const sceneCharacterParams = z.object({
  id: z.uuid(),
  sceneId: z.uuid(),
  characterId: z.uuid(),
})

export const tokenParams = z.object({
  id: z.uuid(),
  tokenId: z.uuid(),
})

export const publicSceneParams = z.object({ sceneId: z.uuid() })

export const publicCharacterParams = z.object({ characterId: z.uuid() })

export const imageBody = z.object({ file: z.file() })
