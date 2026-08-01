'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/use-current-user'
import { useLogout } from '@/features/auth/use-logout'

export function Topbar() {
  const { data: user } = useCurrentUser()
  const logout = useLogout()

  const handleLogout = async () => {
    await logout.mutateAsync()
    // Hard navigation, not router.replace() — see (dashboard)/layout.tsx
    // for why: crossing the auth boundary should always start clean.
    window.location.href = '/login'
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div />
      <div className="flex items-center gap-4">
        {user && (
          <div className="text-right">
            <p className="text-sm font-medium leading-none">
              {user.employee?.fullName ?? user.email}
            </p>
            {user.employee?.role && (
              <span className="mt-1 inline-block rounded-full bg-secondary/20 px-2 py-0.5 text-xs text-secondary">
                {user.employee.role.name}
              </span>
            )}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={handleLogout} disabled={logout.isPending}>
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </header>
  )
}
