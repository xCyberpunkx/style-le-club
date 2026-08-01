'use client'

import { useCurrentUser } from '@/features/auth/use-current-user'
import { Can } from '@/features/auth/can'

export default function DashboardPage() {
  const { data: user } = useCurrentUser()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bonjour, {user?.employee?.fullName ?? user?.email}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ceci confirme que la connexion et les autorisations fonctionnent de bout en bout.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-medium text-muted-foreground">Rôle</h2>
        <p className="mt-1 text-base">{user?.employee?.role?.name ?? 'Aucun rôle assigné'}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-medium text-muted-foreground">Permissions</h2>
        {user && user.permissions.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {user.permissions.map((permission) => (
              <li
                key={permission}
                className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
              >
                {permission}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Aucune permission assignée.</p>
        )}
      </div>

      {/* Proof that permission-gated UI rendering works — this is a UX
          nicety only; the backend guard is what actually enforces it. */}
      <Can
        permission="employees.view"
        fallback={
          <p className="text-sm text-muted-foreground">
            Vous n'avez pas accès à la gestion des employés.
          </p>
        }
      >
        <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
          La gestion des employés arrivera dans une prochaine phase — vous y avez accès.
        </div>
      </Can>
    </div>
  )
}
