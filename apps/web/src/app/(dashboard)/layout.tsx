'use client'

import { useEffect } from 'react'
import { useCurrentUser } from '@/features/auth/use-current-user'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Topbar } from '@/components/dashboard/topbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError, error } = useCurrentUser()

  // Duck-typed rather than a strict `instanceof ApiError` check — immune
  // to any class-identity mismatch across module boundaries (a known sharp
  // edge with classes extending built-ins under some bundler/transpile
  // configurations), since all we actually need is "did the server say 401."
  const status = isError && error && typeof error === 'object' && 'status' in error
    ? (error as { status: unknown }).status
    : null
  const isUnauthenticated = status === 401

  // A hard navigation here, not router.replace(). Crossing the auth
  // boundary (authenticated → not) is exactly the case where a client-side
  // SPA transition is the wrong tool: it carries the existing in-memory
  // query cache along with it, and any stale cached data racing against a
  // fresh 401 can produce a bounce loop between /dashboard and /login. A
  // full page load starts completely clean — new JS, new query cache, no
  // race possible — at the cost of one extra page load, which is a fine
  // trade for an auth redirect that should be rare in practice.
  useEffect(() => {
    if (isUnauthenticated) window.location.href = '/login'
  }, [isUnauthenticated])

  // Never show a blank screen while we find out — a brief, honest loading
  // state instead (blueprint section 6: consistent skeletons, no blank
  // screens on load/error).
  if (isLoading || isUnauthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  if (!user) {
    // isError but not a 401 — a real failure (network down, API 500), not
    // an auth problem. Say so plainly rather than redirecting silently.
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">
          Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 bg-background p-6">{children}</main>
      </div>
    </div>
  )
}
