import { route, router } from '@virentia/router'
import { readToken } from './session'

export const loginRoute = route({
  path: '/login',
  beforeOpen: [async () => {
    if (readToken())
      // homeRoute создаётся ниже: открытие только после вызова гарда, не при инициализации.
      // eslint-disable-next-line ts/no-use-before-define
      await homeRoute.open({ replace: true })
  }],
})
export const registerRoute = route({
  path: '/register',
  beforeOpen: [async () => {
    if (readToken())
      // homeRoute создаётся ниже: открытие только после вызова гарда, не при инициализации.
      // eslint-disable-next-line ts/no-use-before-define
      await homeRoute.open({ replace: true })
  }],
})
export const homeRoute = route({
  path: '/',
  beforeOpen: [async () => {
    if (!readToken())
      await loginRoute.open({ replace: true })
  }],
})
export const joinRoute = route({
  path: '/join/:code',
  beforeOpen: [async () => {
    if (!readToken())
      await loginRoute.open({ replace: true })
  }],
})
export const tableRoute = route({
  path: '/campaigns/:id',
  beforeOpen: [async () => {
    if (!readToken())
      await loginRoute.open({ replace: true })
  }],
})
export const characterRoute = route({
  path: '/campaigns/:id/characters/new',
  beforeOpen: [async () => {
    if (!readToken())
      await loginRoute.open({ replace: true })
  }],
})

export const appRouter = router({
  routes: [loginRoute, registerRoute, joinRoute, characterRoute, tableRoute, homeRoute],
})
