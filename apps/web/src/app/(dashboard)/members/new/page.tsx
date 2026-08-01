'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import type { CreateMemberInput } from '@style-le-club/shared'
import { useCreateMember } from '@/features/members/use-create-member'
import { memberFormSchema, type MemberFormValues } from '@/features/members/member-form-schema'
import { MemberFormFields } from '@/features/members/member-form-fields'
import { ApiError } from '@/lib/api-error'
import { Button } from '@/components/ui/button'

export default function NewMemberPage() {
  const router = useRouter()
  const createMember = useCreateMember()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberFormValues>({ resolver: zodResolver(memberFormSchema) })

  const onSubmit = handleSubmit(async (values) => {
    const payload: CreateMemberInput = {
      fullName: values.fullName,
      phone: values.phone,
      email: values.email,
      goal: values.goal,
      weightKg: values.weightKg,
      heightCm: values.heightCm,
      dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth) : undefined,
      joinDate: values.joinDate ? new Date(values.joinDate) : undefined,
    }
    const res = await createMember.mutateAsync(payload)
    router.push(`/members/${res.data.id}`)
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/members"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux membres
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Nouveau membre</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Le numéro de membre est généré automatiquement à la création.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 rounded-lg border border-border bg-card p-6" noValidate>
        <MemberFormFields register={register} errors={errors} />

        {createMember.isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {createMember.error instanceof ApiError
              ? createMember.error.message
              : 'Une erreur est survenue. Veuillez réessayer.'}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/members')}>
            Annuler
          </Button>
          <Button type="submit" disabled={createMember.isPending}>
            {createMember.isPending ? 'Création…' : 'Créer le membre'}
          </Button>
        </div>
      </form>
    </div>
  )
}
