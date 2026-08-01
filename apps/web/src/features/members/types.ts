export interface Member {
  id: string
  memberCode: string
  fullName: string
  phone: string
  email: string | null
  dateOfBirth: string | null
  weightKg: number | null
  heightCm: number | null
  goal: string | null
  joinDate: string
  active: boolean
  createdAt: string
  updatedAt: string
}
