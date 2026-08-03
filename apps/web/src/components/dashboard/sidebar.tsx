'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ClipboardList, Wallet, DoorOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePermission } from '@/features/auth/use-permission'

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, permission: null },
  { href: '/members', label: 'Membres', icon: Users, permission: 'members.view' },
  { href: '/plans', label: 'Plans', icon: ClipboardList, permission: 'plans.view' },
  { href: '/payments', label: 'Paiements', icon: Wallet, permission: 'payments.view' },
  { href: '/attendance', label: 'Présences', icon: DoorOpen, permission: 'attendance.view' },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const canViewMembers = usePermission('members.view')
  const canViewPlans = usePermission('plans.view')
  const canViewPayments = usePermission('payments.view')
  const canViewAttendance = usePermission('attendance.view')

  const visibleNavItems = navItems.filter((item) => {
    if (item.permission === null) return true
    if (item.permission === 'members.view') return canViewMembers
    if (item.permission === 'plans.view') return canViewPlans
    if (item.permission === 'payments.view') return canViewPayments
    if (item.permission === 'attendance.view') return canViewAttendance
    return false
  })

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-ink text-paper md:flex md:flex-col">
      <div className="px-5 py-6">
        <p className="font-display text-lg font-medium tracking-tight">Style Le Club</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active ? 'bg-bronze text-ink font-medium' : 'text-paper/70 hover:bg-paper/10',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
