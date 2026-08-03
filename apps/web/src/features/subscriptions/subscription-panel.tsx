'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMemberSubscriptions } from './use-member-subscriptions'
import { useCreateSubscription } from './use-create-subscription'
import {
  useCancelSubscription,
  useFreezeSubscription,
  useRenewSubscription,
  useUnfreezeSubscription,
} from './use-subscription-actions'
import { usePlans } from '@/features/plans/use-plans'
import { Can } from '@/features/auth/can'
import { ApiError } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import type { SubscriptionStatus } from './types'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

function statusLabel(status: SubscriptionStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Actif'
    case 'FROZEN':
      return 'Gelé'
    case 'CANCELLED':
      return 'Annulé'
    case 'EXPIRED':
      return 'Expiré'
  }
}

function statusClasses(status: SubscriptionStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-moss/15 text-moss'
    case 'FROZEN':
      return 'bg-bronze/15 text-bronze'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function SubscriptionPanel({ memberId }: { memberId: string }) {
  const { data, isLoading } = useMemberSubscriptions(memberId)
  const { data: plansData } = usePlans({ page: 1, pageSize: 100, activeOnly: true })

  const createSubscription = useCreateSubscription()
  const renewSubscription = useRenewSubscription()
  const freezeSubscription = useFreezeSubscription()
  const unfreezeSubscription = useUnfreezeSubscription()
  const cancelSubscription = useCancelSubscription()

  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const subscriptions = data?.data ?? []
  const hasActiveOrFrozen = subscriptions.some((s) => s.status === 'ACTIVE' || s.status === 'FROZEN')

  const runAction = async (fn: () => Promise<unknown>) => {
    setActionError(null)
    try {
      await fn()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Abonnement</h2>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!isLoading && subscriptions.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun abonnement pour ce membre.</p>
      )}

      {!isLoading && subscriptions.length > 0 && (
        <ul className="space-y-3">
          {subscriptions.map((sub) => (
            <li key={sub.id} className="rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{sub.plan.name}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${statusClasses(sub.status)}`}>
                  {statusLabel(sub.status)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDate(sub.startDate)} → {formatDate(sub.endDate)} ·{' '}
                {sub.priceAtPurchase.toLocaleString('fr-FR')} DZD
              </p>

              <Can permission="subscriptions.update">
                {(sub.status === 'ACTIVE' || sub.status === 'FROZEN') && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Can permission="payments.create">
                      <Link href={`/payments/new?memberId=${memberId}&subscriptionId=${sub.id}`}>
                        <Button type="button" variant="outline" size="sm">
                          Enregistrer un paiement
                        </Button>
                      </Link>
                    </Can>
                    {sub.status === 'ACTIVE' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={freezeSubscription.isPending}
                        onClick={() => runAction(() => freezeSubscription.mutateAsync(sub.id))}
                      >
                        Geler
                      </Button>
                    )}
                    {sub.status === 'FROZEN' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={unfreezeSubscription.isPending}
                        onClick={() => runAction(() => unfreezeSubscription.mutateAsync(sub.id))}
                      >
                        Dégeler
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={renewSubscription.isPending}
                      onClick={() =>
                        runAction(() => renewSubscription.mutateAsync({ id: sub.id, input: {} }))
                      }
                    >
                      Renouveler
                    </Button>
                    <Can permission="subscriptions.delete">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={cancelSubscription.isPending}
                        onClick={() => runAction(() => cancelSubscription.mutateAsync(sub.id))}
                      >
                        Annuler
                      </Button>
                    </Can>
                  </div>
                )}
              </Can>
            </li>
          ))}
        </ul>
      )}

      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
      )}

      <Can permission="subscriptions.create">
        {!hasActiveOrFrozen && (
          <div className="flex items-end gap-2 border-t border-border pt-4">
            <div className="flex-1 space-y-2">
              <label htmlFor="plan-select" className="text-sm font-medium">
                Abonner à un plan
              </label>
              <select
                id="plan-select"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sélectionner un plan…</option>
                {plansData?.data.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — {plan.price.toLocaleString('fr-FR')} DZD / {plan.durationDays}j
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              disabled={!selectedPlanId || createSubscription.isPending}
              onClick={() =>
                runAction(async () => {
                  await createSubscription.mutateAsync({ planId: selectedPlanId, memberIds: [memberId] })
                  setSelectedPlanId('')
                })
              }
            >
              {createSubscription.isPending ? 'Abonnement…' : "S'abonner"}
            </Button>
          </div>
        )}
      </Can>
    </div>
  )
}
