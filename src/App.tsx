import { useEffect, useState } from 'react'
import { INITIAL_CATALOG_SNAPSHOT } from './data/initialSeedData'
import { AdminPage } from './pages/AdminPage'
import { SimulatorPage } from './pages/SimulatorPage'
import { fetchCatalogSnapshot } from './services/apiAdapter'
import type { CatalogSnapshot } from './types/domain'

type AppRoute = 'simulator' | 'admin'

function resolveHashRoute(): AppRoute {
  const hash = (window.location.hash || '').replace(/^#/, '')
  if (hash === '/admin' || hash.startsWith('/admin/')) {
    return 'admin'
  }
  return 'simulator'
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => resolveHashRoute())
  const [catalog, setCatalog] = useState<CatalogSnapshot>(INITIAL_CATALOG_SNAPSHOT)
  const [dataSource, setDataSource] = useState<'gas' | 'local-preview'>('local-preview')

  useEffect(() => {
    const onHashChange = () => {
      setRoute(resolveHashRoute())
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    let active = true
    fetchCatalogSnapshot().then((res) => {
      if (!active) return
      setCatalog(res.snapshot)
      setDataSource(res.source)
    })
    return () => {
      active = false
    }
  }, [])

  const navigateTo = (target: AppRoute) => {
    const nextHash = target === 'admin' ? '#/admin' : '#/'
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash
    }
    setRoute(target)
  }

  if (route === 'admin') {
    return (
      <AdminPage
        catalog={catalog}
        onCatalogSaved={(next) => setCatalog(next)}
        onNavigateCustomer={() => navigateTo('simulator')}
      />
    )
  }

  return (
    <SimulatorPage
      catalog={catalog}
      dataSource={dataSource}
      onNavigateAdmin={() => navigateTo('admin')}
    />
  )
}
