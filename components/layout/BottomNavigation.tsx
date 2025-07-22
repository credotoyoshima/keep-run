'use client'

import { usePathname } from 'next/navigation'
import { ViewTransitionLink } from './ViewTransitionLink'
import { 
  LayoutGrid, 
  CheckSquare, 
  TrendingUp, 
  Star
} from 'lucide-react'

const navigation = [
  {
    name: 'DAY',
    href: '/day',
    icon: LayoutGrid,
  },
  {
    name: 'ToDo',
    href: '/todo',
    icon: CheckSquare,
  },
  {
    name: '継続',
    href: '/routines',
    icon: TrendingUp,
  },
  {
    name: '評価',
    href: '/analytics',
    icon: Star,
  },
]

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-t border-gray-200 flex items-center justify-around pt-2 pb-2 safe-bottom flex-shrink-0">
      {navigation.map((item) => {
        const isActive = pathname === item.href || (item.href === '/day' && pathname === '/')
        const Icon = item.icon
        
        return (
          <ViewTransitionLink
            key={item.name}
            href={item.href}
            prefetch={false}
            className={`flex flex-col items-center justify-center text-xs transition-colors ${
              isActive 
                ? 'text-black' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="mb-1">
              <Icon className={`h-6 w-6 ${isActive ? 'stroke-2' : 'stroke-1.5'}`} />
            </div>
            <span className="font-medium">{item.name}</span>
          </ViewTransitionLink>
        )
      })}
    </nav>
  )
}