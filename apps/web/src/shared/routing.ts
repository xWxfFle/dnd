import { route, router } from '@virentia/router'
import { clearSession, readToken, tokenUnexpired } from './session'

export const loginRoute = route({
  path: '/login',
  beforeOpen: [() => {
    if (tokenUnexpired()) {
      // homeRoute создаётся ниже: открытие только после вызова гарда, не при инициализации.
      // eslint-disable-next-line ts/no-use-before-define
      void homeRoute.open({ replace: true })
      return
    }
    dropDeadToken()
  }],
})
export const registerRoute = route({
  path: '/register',
  beforeOpen: [() => {
    if (tokenUnexpired()) {
      // homeRoute создаётся ниже: открытие только после вызова гарда, не при инициализации.
      // eslint-disable-next-line ts/no-use-before-define
      void homeRoute.open({ replace: true })
      return
    }
    dropDeadToken()
  }],
})
export const homeRoute = route({
  path: '/',
  beforeOpen: [requireAuth],
})
export const joinRoute = route({
  path: '/join/:code',
  beforeOpen: [requireAuth],
})
export const tableRoute = route({
  path: '/campaigns/:id',
  beforeOpen: [requireAuth],
})
export const characterRoute = route({
  path: '/campaigns/:id/characters/new',
  beforeOpen: [requireAuth],
})

export const appRouter = router({
  routes: [loginRoute, registerRoute, joinRoute, characterRoute, tableRoute, homeRoute],
})

function requireAuth() {
  if (tokenUnexpired())
    return
  dropDeadToken()
  void loginRoute.open({ replace: true })
}

function dropDeadToken() {
  if (readToken())
    clearSession()
}
