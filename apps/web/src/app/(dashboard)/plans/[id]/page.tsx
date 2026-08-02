'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import type { UpdatePlanInput } from '@style-le-club/shared'
import { usePlan } from '@/features/plans/use-plan'
import { useUpdatePlan } from '@/features/plans/use-update-plan'
import { useDeletePlan } from '@/features/plans/use-delete-plan'
import { planFormSchema, type PlanFormValues } from '@/features/plans/plan-form-schema'
import { PlanFormFields } from '@/features/plans/plan-form-fields'
import { Can } from '@/features/auth/can'
import { ApiError } from '@/lib/api-error'
import { Button } from '@/components/ui/button'

export default function EditPlanPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { data: plan, isLoading, isError } = usePlan(params.id)
  const updatePlan = useUpdatePlan(params.id)
  const deletePlan = useDeletePlan()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    values: plan
      ? {
          name: plan.name,
          description: plan.description ?? '',
          durationDays: plan.durationDays,
          price: plan.price,
          allowsLinkedMembers: plan.allowsLinkedMembers,
          maxLinkedMembers: plan.maxLinkedMembers,
          isPopular: plan.isPopular,
        }
      : undefined,
  })

  const allowsLinkedMembers = watch('allowsLinkedMembers')

  const onSubmit = handleSubmit(async (values) => {
    const payload: UpdatePlanInput = {
      name: values.name,
      description: values.description ?? null,
      durationDays: values.durationDays,
      price: values.price,
      allowsLinkedMembers: values.allowsLinkedMembers,
      maxLinkedMembers: values.allowsLinkedMembers ? values.maxLinkedMembers : 1,
      isPopular: values.isPopular,
    }
    await updatePlan.mutateAsync(payload)
  })

  const handleDelete = async () => {
    await deletePlan.mutateAsync(params.id)
    router.push('/plans')
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  if (isError || !plan) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted-foreground">Plan introuvable. Il a peut-être été archivé.</p>
        <Link href="/plans" className="mt-3 inline-block text-sm underline">
          Retour aux plans
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/plans"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux plans
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{plan.name}</h1>
          {!plan.active && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              Archivé
            </span>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 rounded-lg border border-border bg-card p-6" noValidate>
        <PlanFormFields register={register} errors={errors} allowsLinkedMembers={allowsLinkedMembers} />

        {updatePlan.isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {updatePlan.error instanceof ApiError
              ? updatePlan.error.message
              : 'Une erreur est survenue. Veuillez réessayer.'}
          </p>
        )}

        <div className="flex items-center justify-between">
          <Can permission="plans.delete">
            {!confirmingDelete ? (
              <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(true)}>
                Archiver ce plan
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Confirmer l'archivage ?</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDelete}
                  disabled={deletePlan.isPending}
                >
                  {deletePlan.isPending ? 'Archivage…' : 'Confirmer'}
                </Button>
              </div>
            )}
          </Can>

          <Can permission="plans.update">
            <Button type="submit" disabled={updatePlan.isPending}>
              {updatePlan.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </Can>
        </div>
      </form>
    </div>
  )
}
