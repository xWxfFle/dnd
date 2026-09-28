import type { LoginInput, RegisterInput } from '@dnd/shared'
import { authResponseSchema, campaignSchema, characterSchema, diceRollSchema, snapshotSchema, srdEntrySchema } from '@dnd/shared'
import { scoped } from '@virentia/core'
import { mutation, query } from '@virentia/net-core'
import { z } from 'zod'
import { appScope, readToken, token } from './session'

export class ApiError extends Error {}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  const current = readToken()
  if (current)
    headers.set('Authorization', `Bearer ${current}`)
  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')
  const response = await fetch(path, { ...init, headers })
  if (response.status === 401 && !path.endsWith('/auth/login') && !path.endsWith('/auth/register')) {
    scoped(appScope, () => {
      token.value = null
    })
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }))
    const message = typeof payload.error === 'string' ? payload.error : 'Запрос не прошёл'
    throw new ApiError(message)
  }
  return response
}

export const loginMutation = mutation({
  handler: async (input: LoginInput) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok)
      throw new ApiError('Неверная почта или пароль')
    return authResponseSchema.parse(await response.json())
  },
})

export const registerMutation = mutation({
  handler: async (input: RegisterInput) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok)
      throw new ApiError('Не удалось зарегистрироваться')
    return authResponseSchema.parse(await response.json())
  },
})

export const campaignsQuery = query({
  handler: async () => {
    const response = await apiFetch('/api/campaigns')
    return z.array(campaignSchema).parse(await response.json())
  },
})

export const srdQuery = query({
  handler: async () => {
    const response = await apiFetch('/api/srd')
    return z.array(srdEntrySchema).parse(await response.json())
  },
})

export const snapshotQuery = query({
  handler: async (campaignId: string) => {
    const response = await apiFetch(`/api/campaigns/${campaignId}/snapshot`)
    return snapshotSchema.parse(await response.json())
  },
})

export const createCampaignMutation = mutation({
  handler: async (name: string) => {
    const response = await apiFetch('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    return campaignSchema.parse(await response.json())
  },
})

export const joinMutation = mutation({
  handler: async (code: string) => {
    const response = await apiFetch(`/api/campaigns/join/${code}`, { method: 'POST' })
    return campaignSchema.parse(await response.json())
  },
})

export const createCharacterMutation = mutation({
  handler: async (input: { campaignId: string, body: unknown }) => {
    const response = await apiFetch(`/api/campaigns/${input.campaignId}/characters`, {
      method: 'POST',
      body: JSON.stringify(input.body),
    })
    return characterSchema.parse(await response.json())
  },
})

export const rollMutation = mutation({
  handler: async (input: { campaignId: string, label: string, formula: string, mode: 'normal' | 'advantage' | 'disadvantage' }) => {
    const response = await apiFetch(`/api/campaigns/${input.campaignId}/rolls`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return diceRollSchema.parse(await response.json())
  },
})
