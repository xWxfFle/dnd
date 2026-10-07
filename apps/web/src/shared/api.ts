import type { LoginInput, RegisterInput } from '@dnd/shared'
import { authResponseSchema, campaignSchema, characterSchema, diceRollSchema, lanHostsSchema, meResponseSchema, okSchema, snapshotSchema, srdEntrySchema } from '@dnd/shared'
import { mutation, query } from '@virentia/net-core'
import { z } from 'zod'
import { noteUnauthorized, readToken } from './session'

export class ApiError extends Error {}

type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface Parser<T> {
  parse: (data: unknown) => T
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  const current = readToken()
  if (current)
    headers.set('Authorization', `Bearer ${current}`)
  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')
  const response = await fetch(path, { ...init, headers })
  if (response.status === 401 && !path.endsWith('/auth/login') && !path.endsWith('/auth/register'))
    noteUnauthorized()
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }))
    const message = typeof payload.error === 'string' ? payload.error : 'Запрос не прошёл'
    throw new ApiError(message)
  }
  return response
}

export function apiSend(path: string, method: ApiMethod = 'GET', body?: unknown) {
  return apiFetch(path, {
    method,
    body: body === undefined || body instanceof FormData ? body : JSON.stringify(body),
  })
}

export async function apiRead<T>(path: string, schema: Parser<T>, method: ApiMethod = 'GET', body?: unknown, failure?: string) {
  try {
    const response = await apiSend(path, method, body)
    return schema.parse(await response.json())
  }
  catch (error) {
    if (failure && error instanceof ApiError)
      throw new ApiError(failure)
    throw error
  }
}

export const loginMutation = mutation({
  handler: (input: LoginInput) => apiRead('/api/auth/login', authResponseSchema, 'POST', input, 'Неверная почта или пароль'),
})

export const registerMutation = mutation({
  handler: (input: RegisterInput) => apiRead('/api/auth/register', authResponseSchema, 'POST', input, 'Не удалось зарегистрироваться'),
})

export const meQuery = query({
  handler: () => apiRead('/api/auth/me', meResponseSchema),
})

export const lanHostsQuery = query({
  handler: () => apiRead('/api/lan', lanHostsSchema),
})

export const campaignsQuery = query({
  handler: () => apiRead('/api/campaigns', z.array(campaignSchema)),
})

const srdListSchema = z.array(srdEntrySchema)

function readSrd(kind: string) {
  return apiRead(`/api/srd?kind=${kind}`, srdListSchema)
}

export const srdKitQuery = query({
  handler: () => readSrd('class,subclass,species,background,feat'),
})

export const srdGearQuery = query({
  handler: () => readSrd('item'),
})

export const srdSpellsQuery = query({
  handler: () => readSrd('spell'),
})

export const srdMonstersQuery = query({
  handler: () => readSrd('monster'),
})

export const snapshotQuery = query({
  handler: (campaignId: string) => apiRead(`/api/campaigns/${campaignId}/snapshot`, snapshotSchema),
})

export const createCampaignMutation = mutation({
  handler: (name: string) => apiRead('/api/campaigns', campaignSchema, 'POST', { name }),
})

export const deleteCampaignMutation = mutation({
  handler: (id: string) => apiRead(`/api/campaigns/${id}`, okSchema, 'DELETE'),
  invalidates: [campaignsQuery],
})

export const joinMutation = mutation({
  handler: (code: string) => apiRead(`/api/campaigns/join/${code}`, campaignSchema, 'POST'),
})

export const createCharacterMutation = mutation({
  handler: (input: { campaignId: string, body: unknown }) => apiRead(`/api/campaigns/${input.campaignId}/characters`, characterSchema, 'POST', input.body),
})

export const rollMutation = mutation({
  handler: (input: { campaignId: string, label: string, formula: string, mode: 'normal' | 'advantage' | 'disadvantage' }) => apiRead(`/api/campaigns/${input.campaignId}/rolls`, diceRollSchema, 'POST', input),
})
