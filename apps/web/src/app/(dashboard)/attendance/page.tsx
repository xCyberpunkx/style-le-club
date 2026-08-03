'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { useMembers } from '@/features/members/use-members'
import { useAttendance } from '@/features/attendance/use-attendance'
import { useCheckIn, useCheckOut } from '@/features/attendance/use-check-in-out'
import { Can } from '@/features/auth/can'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api-error'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function AttendancePage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: searchResults, isFetching: isSearching } = useMembers({
    page: 1,
    pageSize: 10,
    search,
  })
  const { data: openRecords, isLoading: isLoadingOpen } = useAttendance({
    page: 1,
    pageSize: 50,
    open: true,
  })

  const checkIn = useCheckIn()
  const checkOut = useCheckOut()

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  const runAction = async (fn: () => Promise<unknown>) => {
    setActionError(null)
    try {
      await fn()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    }
  }

  const currentlyInIds = new Set((openRecords?.data ?? []).map((r) => r.member.id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Présences</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enregistrer les entrées et sorties des membres.
        </p>
      </div>

      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Enregistrer une entrée</h2>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nom, téléphone ou numéro…"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline" disabled={isSearching}>
              Rechercher
            </Button>
          </form>

          <ul className="space-y-2">
            {search && searchResults?.data.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun membre trouvé.</p>
            )}
            {searchResults?.data.map((member) => {
              const alreadyIn = currentlyInIds.has(member.id)
              return (
                <li
                  key={member.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <p className="font-medium">{member.fullName}</p>
                    <p className="text-sm text-muted-foreground">{member.memberCode}</p>
                  </div>
                  <Can permission="attendance.manage">
                    <Button
                      type="button"
                      size="sm"
                      disabled={alreadyIn || checkIn.isPending}
                      onClick={() => runAction(() => checkIn.mutateAsync(member.id))}
                    >
                      {alreadyIn ? 'Déjà présent' : "Enregistrer l'entrée"}
                    </Button>
                  </Can>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Actuellement dans la salle</h2>
            {openRecords && (
              <span className="rounded-full bg-moss/15 px-2.5 py-0.5 text-xs text-moss">
                {openRecords.meta.total}
              </span>
            )}
          </div>

          {isLoadingOpen && <p className="text-sm text-muted-foreground">Chargement…</p>}

          {!isLoadingOpen && openRecords?.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Personne dans la salle pour le moment.</p>
          )}

          <ul className="space-y-2">
            {openRecords?.data.map((record) => (
              <li
                key={record.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <p className="font-medium">{record.member.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    Entrée à {formatTime(record.checkInAt)}
                  </p>
                </div>
                <Can permission="attendance.manage">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={checkOut.isPending}
                    onClick={() => runAction(() => checkOut.mutateAsync(record.member.id))}
                  >
                    Enregistrer la sortie
                  </Button>
                </Can>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
