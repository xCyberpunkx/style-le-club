export interface Plan {
  id: string
  name: string
  description: string | null
  durationDays: number
  price: number
  allowsLinkedMembers: boolean
  maxLinkedMembers: number
  isPopular: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}
