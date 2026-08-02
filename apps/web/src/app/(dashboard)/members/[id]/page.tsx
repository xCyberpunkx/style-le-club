'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import type { UpdateMemberInput } from '@style-le-club/shared'
import { useMember } from '@/features/members/use-member'
import { useUpdateMember } from '@/features/members/use-update-member'
import { useDeleteMember } from '@/features/members/use-delete-member'
import { memberFormSchema, type MemberFormValues } from '@/features/members/member-form-schema'
import { MemberFormFields } from '@/features/members/member-form-fields'
import { SubscriptionPanel } from '@/features/subscriptions/subscription-panel'
import { Can } from '@/features/auth/can'
import { ApiError } from '@/lib/api-error'
import { Button } from '@/components/ui/button'

function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

export default function EditMemberPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { data: member, isLoading, isError } = useMember(params.id)
  const updateMember = useUpdateMember(params.id)
  const deleteMember = useDeleteMember()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    values: member
      ? {
          fullName: member.fullName,
          phone: member.phone,
          email: member.email ?? '',
          dateOfBirth: toDateInputValue(member.dateOfBirth),
          joinDate: toDateInputValue(member.joinDate),
          weightKg: member.weightKg ?? undefined,
          heightCm: member.heightCm ?? undefined,
          goal: member.goal ?? '',
        }
      : undefined,
  })

  const onSubmit = handleSubmit(async (values) => {
    const payload: UpdateMemberInput = {
      fullName: values.fullName,
      phone: values.phone,
      email: values.email ?? null,
      goal: values.goal ?? null,
      weightKg: values.weightKg ?? null,
      heightCm: values.heightCm ?? null,
      dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth) : null,
      joinDate: values.joinDate ? new Date(values.joinDate) : undefined,
    }
    await updateMember.mutateAsync(payload)
  })

  const handleDelete = async () => {
    await deleteMember.mutateAsync(params.id)
    router.push('/members')
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  if (isError || !member) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted-foreground">
          Membre introuvable. Il a peut-être été supprimé.
        </p>
        <Link href="/members" className="mt-3 inline-block text-sm underline">
          Retour aux membres
        </Link>
      </div>
    )
  }

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
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{member.fullName}</h1>
          {!member.active && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              Archivé
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Numéro de membre : {member.memberCode}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 rounded-lg border border-border bg-card p-6" noValidate>
        <MemberFormFields register={register} errors={errors} />

        {updateMember.isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {updateMember.error instanceof ApiError
              ? updateMember.error.message
              : 'Une erreur est survenue. Veuillez réessayer.'}
          </p>
        )}

        <div className="flex items-center justify-between">
          <Can permission="members.delete">
            {!confirmingDelete ? (
              <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(true)}>
                Archiver ce membre
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
                  disabled={deleteMember.isPending}
                >
                  {deleteMember.isPending ? 'Archivage…' : 'Confirmer'}
                </Button>
              </div>
            )}
          </Can>

          <Can permission="members.update">
            <Button type="submit" disabled={updateMember.isPending}>
              {updateMember.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </Can>
        </div>
      </form>

      <SubscriptionPanel memberId={member.id} />
    </div>
  )
}
