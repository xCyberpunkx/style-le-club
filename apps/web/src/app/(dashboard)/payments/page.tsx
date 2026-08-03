'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { createPaymentSchema, type CreatePaymentInput } from '@style-le-club/shared'
import { useCreatePayment } from '@/features/payments/use-create-payment'
import { PaymentFormFields } from '@/features/payments/payment-form-fields'
import { useMembers } from '@/features/members/use-members'
import { useMemberSubscriptions } from '@/features/subscriptions/use-member-subscriptions'
import { ApiError } from '@/lib/api-error'
import { Button } from '@/components/ui/button'

function NewPaymentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const createPayment = useCreatePayment()

  const [selectedMemberId, setSelectedMemberId] = useState(searchParams.get('memberId') ?? '')

  const { data: membersData } = useMembers({ page: 1, pageSize: 100 })
  const { data: subscriptionsData } = useMemberSubscriptions(selectedMemberId || undefined)

  const form = useForm<CreatePaymentInput>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      memberId: selectedMemberId,
      subscriptionId: searchParams.get('subscriptionId') ?? '',
      method: 'CASH',
      status: 'PAID',
      amount: 0,
      splits: [],
    },
  })

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId)
    form.setValue('memberId', memberId)
    form.setValue('subscriptionId', '')
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await createPayment.mutateAsync(values)
    router.push(`/payments?highlight=${res.data.id}`)
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/payments"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux paiements
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Enregistrer un paiement</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 rounded-lg border border-border bg-card p-6" noValidate>
        <PaymentFormFields
          form={form}
          members={membersData?.data ?? []}
          memberSubscriptions={subscriptionsData?.data ?? []}
          selectedMemberId={selectedMemberId}
          onSelectMember={handleSelectMember}
        />

        {createPayment.isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {createPayment.error instanceof ApiError
              ? createPayment.error.message
              : 'Une erreur est survenue. Veuillez réessayer.'}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/payments')}>
            Annuler
          </Button>
          <Button type="submit" disabled={createPayment.isPending}>
            {createPayment.isPending ? 'Enregistrement…' : 'Enregistrer le paiement'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NewPaymentPage() {
  return (
    <Suspense fallback={null}>
      <NewPaymentForm />
    </Suspense>
  )
}
