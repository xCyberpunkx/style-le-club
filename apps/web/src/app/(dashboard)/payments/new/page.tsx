'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { usePayments } from '@/features/payments/use-payments'
import { useRefundPayment } from '@/features/payments/use-create-payment'
import type { PaymentMethod, PaymentStatus } from '@/features/payments/types'
import { Can } from '@/features/auth/can'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-error'

const PAGE_SIZE = 20

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

function formatAmount(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} DZD`
}

function methodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'CASH':
      return 'Espèces'
    case 'CARD':
      return 'Carte'
    case 'MIXED':
      return 'Mixte'
  }
}

function statusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'PAID':
      return 'Payé'
    case 'PENDING':
      return 'En attente'
    case 'REFUNDED':
      return 'Remboursé'
  }
}

function statusClasses(status: PaymentStatus): string {
  switch (status) {
    case 'PAID':
      return 'bg-moss/15 text-moss'
    case 'PENDING':
      return 'bg-bronze/15 text-bronze'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsList />
    </Suspense>
  )
}

function PaymentsList() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching, isError } = usePayments({ page, pageSize: PAGE_SIZE })
  const refundPayment = useRefundPayment()
  const [actionError, setActionError] = useState<string | null>(null)

  const handleRefund = async (id: string) => {
    setActionError(null)
    try {
      await refundPayment.mutateAsync(id)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Paiements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.meta.total} paiement${data.meta.total > 1 ? 's' : ''}` : 'Chargement…'}
          </p>
        </div>
        <Can permission="payments.create">
          <Link href="/payments/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Enregistrer un paiement
            </Button>
          </Link>
        </Can>
      </div>

      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Reçu</th>
              <th className="px-4 py-3 font-medium">Membre</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Méthode</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Montant</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  Chargement des paiements…
                </td>
              </tr>
            )}

            {isError && !isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-destructive">
                  Impossible de charger les paiements. Veuillez réessayer.
                </td>
              </tr>
            )}

            {!isLoading && !isError && data?.data.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun paiement pour le moment.
                </td>
              </tr>
            )}

            {data?.data.map((payment) => (
              <tr
                key={payment.id}
                className={payment.id === highlightId ? 'bg-bronze/10' : 'hover:bg-muted/30'}
              >
                <td className="px-4 py-3 font-medium">{payment.receiptNumber}</td>
                <td className="px-4 py-3">{payment.member.fullName}</td>
                <td className="px-4 py-3 text-muted-foreground">{payment.subscription.plan.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{methodLabel(payment.method)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(payment.paidAt)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${statusClasses(payment.status)}`}>
                    {statusLabel(payment.status)}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{formatAmount(payment.amount)}</td>
                <td className="px-4 py-3 text-right">
                  <Can permission="payments.refund">
                    {payment.status === 'PAID' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={refundPayment.isPending}
                        onClick={() => handleRefund(payment.id)}
                      >
                        Rembourser
                      </Button>
                    )}
                  </Can>
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
