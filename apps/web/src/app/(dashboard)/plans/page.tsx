'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { usePlans } from '@/features/plans/use-plans'
import { Can } from '@/features/auth/can'
import { Button } from '@/components/ui/button'

const PAGE_SIZE = 20

function formatPrice(price: number): string {
  return `${price.toLocaleString('fr-FR')} DZD`
}

export default function PlansPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching, isError } = usePlans({ page, pageSize: PAGE_SIZE })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Plans d'abonnement</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.meta.total} plan${data.meta.total > 1 ? 's' : ''}` : 'Chargement…'}
          </p>
        </div>
        <Can permission="plans.create">
          <Link href="/plans/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau plan
            </Button>
          </Link>
        </Can>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Durée</th>
              <th className="px-4 py-3 font-medium">Prix</th>
              <th className="px-4 py-3 font-medium">Couple</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Chargement des plans…
                </td>
              </tr>
            )}

            {isError && !isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-destructive">
                  Impossible de charger les plans. Veuillez réessayer.
                </td>
              </tr>
            )}

            {!isLoading && !isError && data?.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun plan pour le moment.
                </td>
              </tr>
            )}

            {data?.data.map((plan) => (
              <tr key={plan.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link href={`/plans/${plan.id}`} className="font-medium hover:underline">
                    {plan.name}
                  </Link>
                  {plan.isPopular && (
                    <span className="ml-2 rounded-full bg-bronze/15 px-2 py-0.5 text-xs text-bronze">
                      Populaire
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{plan.durationDays} jours</td>
                <td className="px-4 py-3 text-muted-foreground">{formatPrice(plan.price)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {plan.allowsLinkedMembers ? `Jusqu'à ${plan.maxLinkedMembers}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      plan.active
                        ? 'rounded-full bg-moss/15 px-2.5 py-0.5 text-xs text-moss'
                        : 'rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground'
                    }
                  >
                    {plan.active ? 'Actif' : 'Archivé'}
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
