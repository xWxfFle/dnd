import { ScopeProvider } from '@virentia/react'
import { historyAdapter } from '@virentia/router'
import { RouterProvider } from '@virentia/router-react'
import { createBrowserHistory } from 'history'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/app'
import { bootClient } from './shared/boot'
import { appRouter } from './shared/routing'
import { appScope } from './shared/session'
import './styles.css'

const root = document.getElementById('root')
if (!root)
  throw new Error('Нет #root')

bootClient()

createRoot(root).render(
  <StrictMode>
    <ScopeProvider scope={appScope}>
      <RouterProvider router={appRouter} history={historyAdapter(createBrowserHistory())}>
        <App />
      </RouterProvider>
    </ScopeProvider>
  </StrictMode>,
)
