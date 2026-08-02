import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PlanFormValues } from './plan-form-schema'

interface PlanFormFieldsProps {
  register: UseFormRegister<PlanFormValues>
  errors: FieldErrors<PlanFormValues>
  allowsLinkedMembers: boolean
}

export function PlanFormFields({ register, errors, allowsLinkedMembers }: PlanFormFieldsProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="name">Nom du plan</Label>
        <Input id="name" placeholder="Abonnement Or — 3 mois" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{String(errors.name.message)}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="durationDays">Durée (jours)</Label>
        <Input id="durationDays" type="number" min="1" step="1" {...register('durationDays')} />
        {errors.durationDays && (
          <p className="text-sm text-destructive">{String(errors.durationDays.message)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Prix (DZD)</Label>
        <Input id="price" type="number" min="0" step="1" {...register('price')} />
        {errors.price && <p className="text-sm text-destructive">{String(errors.price.message)}</p>}
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="description">Description (optionnel)</Label>
        <Input id="description" placeholder="Accès illimité salle + cours collectifs" {...register('description')} />
        {errors.description && (
          <p className="text-sm text-destructive">{String(errors.description.message)}</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 rounded border-border" {...register('allowsLinkedMembers')} />
        Plan à plusieurs membres (couple)
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 rounded border-border" {...register('isPopular')} />
        Marquer comme "Populaire"
      </label>

      {allowsLinkedMembers && (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="maxLinkedMembers">Nombre maximum de membres liés</Label>
          <Input id="maxLinkedMembers" type="number" min="2" step="1" {...register('maxLinkedMembers')} />
          {errors.maxLinkedMembers && (
            <p className="text-sm text-destructive">{String(errors.maxLinkedMembers.message)}</p>
          )}
        </div>
      )}
    </div>
  )
}
