'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { useMembers } from '@/features/members/use-members'
import { Can } from '@/features/auth/can'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PAGE_SIZE = 20

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export default function MembersPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading, isFetching, isError } = useMembers({ page, pageSize: PAGE_SIZE, search })

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Membres</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.meta.total} membre${data.meta.total > 1 ? 's' : ''}` : 'Chargement…'}
          </p>
        </div>
        <Can permission="members.create">
          <Link href="/members/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau membre
            </Button>
          </Link>
        </Can>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex max-w-sm gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher par nom, téléphone ou numéro…"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Rechercher
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Numéro</th>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
              <th className="px-4 py-3 font-medium">Adhésion</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Chargement des membres…
                </td>
              </tr>
            )}

            {isError && !isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-destructive">
                  Impossible de charger les membres. Veuillez réessayer.
                </td>
              </tr>
            )}

            {!isLoading && !isError && data?.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {search ? 'Aucun membre ne correspond à cette recherche.' : 'Aucun membre pour le moment.'}
                </td>
              </tr>
            )}

            {data?.data.map((member) => (
              <tr key={member.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{member.memberCode}</td>
                <td className="px-4 py-3">
                  <Link href={`/members/${member.id}`} className="font-medium hover:underline">
                    {member.fullName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{member.phone}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(member.joinDate)}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      member.active
                        ? 'rounded-full bg-moss/15 px-2.5 py-0.5 text-xs text-moss'
                        : 'rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground'
                    }
                  >
                    {member.active ? 'Actif' : 'Archivé'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.meta.page} sur {data.meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              Précédent
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
