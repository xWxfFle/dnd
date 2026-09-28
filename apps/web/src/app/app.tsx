import { routesView, routeView } from '@virentia/router-react'
import { CharacterPage } from '@/pages/character/page'
import { HomePage } from '@/pages/home/page'
import { JoinPage } from '@/pages/join/page'
import { LoginPage } from '@/pages/login/page'
import { RegisterPage } from '@/pages/register/page'
import { TablePage } from '@/pages/table/page'
import { characterRoute, homeRoute, joinRoute, loginRoute, registerRoute, tableRoute } from '@/shared/routing'
import { Providers } from './providers'

const Routes = routesView({
  routes: [
    routeView({ route: loginRoute, view: LoginPage }),
    routeView({ route: registerRoute, view: RegisterPage }),
    routeView({ route: homeRoute, view: HomePage }),
    routeView({ route: joinRoute, view: JoinPage }),
    routeView({ route: tableRoute, view: TablePage }),
    routeView({ route: characterRoute, view: CharacterPage }),
  ],
})

export function App() {
  return (
    <Providers>
      <Routes />
    </Providers>
  )
}
