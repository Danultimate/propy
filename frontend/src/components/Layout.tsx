import { Outlet, NavLink } from 'react-router-dom'
import { Users, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Zap className="h-5 w-5" />
            <span>Propy</span>
          </div>
          <nav className="flex gap-1">
            <NavLink
              to="/clients"
              className={({ isActive }) =>
                cn('flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted')
              }
            >
              <Users className="h-4 w-4" />
              Clients
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
