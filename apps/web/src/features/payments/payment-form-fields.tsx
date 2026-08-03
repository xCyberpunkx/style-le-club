'use client'

import { useEffect } from 'react'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import type { CreatePaymentInput } from '@style-le-club/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Member } from '@/features/members/types'
import type { Subscription } from '@/features/subscriptions/types'

interface PaymentFormFieldsProps {
  form: UseFormReturn<CreatePaymentInput>
  members: Member[]
  memberSubscriptions: Subscription[]
  selectedMemberId: string
  onSelectMember: (memberId: string) => void
}

export function PaymentFormFields({
  form,
  members,
  memberSubscriptions,
  selectedMemberId,
  onSelectMember,
}: PaymentFormFieldsProps) {
  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors },
  } = form

  const method = watch('method')
  const subscriptionId = watch('subscriptionId')

  const { fields, append, remove } = useFieldArray({ control, name: 'splits' })

  // Only ACTIVE/FROZEN subscriptions make sense to pay against — this is
  // a UX narrowing in the picker, not a backend restriction (the API
  // doesn't reject other statuses; see payments.service.ts).
  const payableSubscriptions = memberSubscriptions.filter(
    (s) => s.status === 'ACTIVE' || s.status === 'FROZEN',
  )

  // Prefill amount from the subscription's price whenever the selection
  // changes, but only if the user hasn't already typed a different value
  // for this same subscription — avoids clobbering a manual edit.
  useEffect(() => {
    const subscription = payableSubscriptions.find((s) => s.id === subscriptionId)
    if (subscription) {
      setValue('amount', subscription.priceAtPurchase)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId])

  useEffect(() => {
    if (method === 'MIXED' && fields.length < 2) {
      append({ method: 'CASH', amount: 0 })
      append({ method: 'CARD', amount: 0 })
    }
    if (method !== 'MIXED' && fields.length > 0) {
      remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method])

  return (
    <div className="grid gap-5">
      <div className="space-y-2">
        <Label htmlFor="memberId">Membre</Label>
        <select
          id="memberId"
          value={selectedMemberId}
          onChange={(e) => onSelectMember(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Sélectionner un membre…</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.fullName} — {member.memberCode}
            </option>
          ))}
        </select>
      </div>

      {selectedMemberId && (
        <div className="space-y-2">
          <Label htmlFor="subscriptionId">Abonnement</Label>
          <select
            id="subscriptionId"
            {...register('subscriptionId')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Sélectionner un abonnement…</option>
            {payableSubscriptions.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.plan.name} — {sub.priceAtPurchase.toLocaleString('fr-FR')} DZD
              </option>
            ))}
          </select>
          {payableSubscriptions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ce membre n'a aucun abonnement actif ou gelé.
            </p>
          )}
          {errors.subscriptionId && (
            <p className="text-sm text-destructive">{String(errors.subscriptionId.message)}</p>
          )}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Montant (DZD)</Label>
          <Input id="amount" type="number" min="0" step="1" {...register('amount')} />
          {errors.amount && <p className="text-sm text-destructive">{String(errors.amount.message)}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="method">Méthode de règlement</Label>
          <select
            id="method"
            {...register('method')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="CASH">Espèces</option>
            <option value="CARD">Carte</option>
            <option value="MIXED">Mixte (espèces + carte)</option>
          </select>
        </div>
      </div>

      {method === 'MIXED' && (
        <div className="space-y-3 rounded-md border border-border p-4">
          <p className="text-sm font-medium">Répartition du règlement</p>
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-3">
              <span className="w-20 text-sm text-muted-foreground">
                {field.method === 'CASH' ? 'Espèces' : 'Carte'}
              </span>
              <Input
                type="number"
                min="0"
                step="1"
                {...register(`splits.${index}.amount` as const)}
              />
            </div>
          ))}
          {errors.splits && (
            <p className="text-sm text-destructive">
              {typeof errors.splits.message === 'string'
                ? errors.splits.message
                : 'Vérifiez la répartition du règlement.'}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Statut</Label>
          <select
            id="status"
            {...register('status')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="PAID">Payé</option>
            <option value="PENDING">En attente</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optionnel)</Label>
          <Input id="notes" {...register('notes')} />
        </div>
      </div>
    </div>
  )
}
