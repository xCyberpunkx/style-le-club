import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MemberFormValues } from './member-form-schema'

interface MemberFormFieldsProps {
  register: UseFormRegister<MemberFormValues>
  errors: FieldErrors<MemberFormValues>
}

export function MemberFormFields({ register, errors }: MemberFormFieldsProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="fullName">Nom complet</Label>
        <Input id="fullName" placeholder="Amine Belkacem" {...register('fullName')} />
        {errors.fullName && (
          <p className="text-sm text-destructive">{String(errors.fullName.message)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Téléphone</Label>
        <Input id="phone" placeholder="0555 12 34 56" {...register('phone')} />
        {errors.phone && <p className="text-sm text-destructive">{String(errors.phone.message)}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail (optionnel)</Label>
        <Input id="email" type="email" placeholder="client@exemple.com" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{String(errors.email.message)}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">Date de naissance</Label>
        <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
        {errors.dateOfBirth && (
          <p className="text-sm text-destructive">{String(errors.dateOfBirth.message)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="joinDate">Date d'adhésion</Label>
        <Input id="joinDate" type="date" {...register('joinDate')} />
        {errors.joinDate && (
          <p className="text-sm text-destructive">{String(errors.joinDate.message)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="weightKg">Poids (kg)</Label>
        <Input id="weightKg" type="number" step="0.1" min="0" {...register('weightKg')} />
        {errors.weightKg && (
          <p className="text-sm text-destructive">{String(errors.weightKg.message)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="heightCm">Taille (cm)</Label>
        <Input id="heightCm" type="number" step="0.1" min="0" {...register('heightCm')} />
        {errors.heightCm && (
          <p className="text-sm text-destructive">{String(errors.heightCm.message)}</p>
        )}
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="goal">Objectif (optionnel)</Label>
        <Input id="goal" placeholder="Perte de poids, prise de masse…" {...register('goal')} />
        {errors.goal && <p className="text-sm text-destructive">{String(errors.goal.message)}</p>}
      </div>
    </div>
  )
}
