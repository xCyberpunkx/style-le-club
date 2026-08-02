'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import type { CreatePlanInput } from '@style-le-club/shared'
import { useCreatePlan } from '@/features/plans/use-create-plan'
import { planFormSchema, type PlanFormValues } from '@/features/plans/plan-form-schema'
import { PlanFormFields } from '@/features/plans/plan-form-fields'
import { ApiError } from '@/lib/api-error'
import { Button } from '@/components/ui/button'

export default function NewPlanPage() {
  const router = useRouter()
  const createPlan = useCreatePlan()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: { allowsLinkedMembers: false, isPopular: false, maxLinkedMembers: 1 },
  })

  const allowsLinkedMembers = watch('allowsLinkedMembers')

  const onSubmit = handleSubmit(async (values) => {
    const payload: CreatePlanInput = {
      name: values.name,
      description: values.description,
      durationDays: values.durationDays,
      price: values.price,
      allowsLinkedMembers: values.allowsLinkedMembers,
      maxLinkedMembers: values.allowsLinkedMembers ? values.maxLinkedMembers : 1,
      isPopular: values.isPopular,
    }
    const res = await createPlan.mutateAsync(payload)
    router.push(`/plans/${res.data.id}`)
  })

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
        <h1 className="mt-2 text-2xl font-semibold">Nouveau plan</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 rounded-lg border border-border bg-card p-6" noValidate>
        <PlanFormFields register={register} errors={errors} allowsLinkedMembers={allowsLinkedMembers} />

        {createPlan.isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {createPlan.error instanceof ApiError
              ? createPlan.error.message
              : 'Une erreur est survenue. Veuillez réessayer.'}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/plans')}>
            Annuler
          </Button>
          <Button type="submit" disabled={createPlan.isPending}>
            {createPlan.isPending ? 'Création…' : 'Créer le plan'}
          </Button>
        </div>
      </form>
    </div>
  )
}
