'use client'

import type { ReactNode } from 'react'
import { usePermission } from './use-permission'

interface CanProps {
  permission: string
  children: ReactNode
  fallback?: ReactNode
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const allowed = usePermission(permission)
  return <>{allowed ? children : fallback}</>
}
