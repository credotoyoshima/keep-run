"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  {
    name: 'DAY',
    href: '/day',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    name: 'ToDo',
    href: '/todo',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <polyline points="9 11 12 14 20 6" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    name: '継続',
    href: '/continuous',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    name: '評価',
    href: '/evaluation',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <polygon points="12 2 15 8.5 22 9.3 17 14.2 18.5 21.2 12 17.8 5.5 21.2 7 14.2 2 9.3 9 8.5 12 2" />
      </svg>
    ),
  },
  {
    name: '設定',
    href: '/settings',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6m0 6v6m11-11h-6m-6 0H1" />
      </svg>
    ),
  },
]

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-border">
      <div className="flex justify-around items-center h-full pb-6">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center text-xs space-y-1 transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <div className="w-6 h-6">{item.icon}</div>
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}