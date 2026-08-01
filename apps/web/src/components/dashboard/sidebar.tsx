'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [{ href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard }]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-ink text-paper md:flex md:flex-col">
      <div className="px-5 py-6">
        <p className="font-display text-lg font-medium tracking-tight">Style Le Club</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
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
