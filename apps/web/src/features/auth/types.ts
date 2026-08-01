export interface CurrentUserRole {
  id: string
  name: string
}

export interface CurrentUserEmployee {
  id: string
  fullName: string
  role: CurrentUserRole | null
}

export interface CurrentUser {
  id: string
  email: string
  organizationId: string
  employee: CurrentUserEmployee | null
  permissions: string[]
}
