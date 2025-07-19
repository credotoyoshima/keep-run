'use client'

import { usePathname } from 'next/navigation'
import { ViewTransitionLink } from './ViewTransitionLink'
import { 
  LayoutGrid, 
  CheckSquare, 
  TrendingUp, 
  Star
} from 'lucide-react'
// import { usePrefetch } from '@/lib/hooks/usePrefetch'
// import { useEffect, useState } from 'react'
// import { createClient } from '@/lib/supabase/client'

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
  // プリフェッチ機能を一時的に無効化
  // const { prefetchTimeBlocks, prefetchTodos, prefetchHabits, prefetchEvaluations } = usePrefetch()
  // const [isAuthenticated, setIsAuthenticated] = useState(false)

  // 認証状態を確認
  // useEffect(() => {
  //   const checkAuth = async () => {
  //     const supabase = createClient()
  //     const { data: { session } } = await supabase.auth.getSession()
  //     setIsAuthenticated(!!session)
  //   }

  //   checkAuth()
  // }, [])

  // 現在のページに基づいて隣接ページのデータをプリフェッチ
  // useEffect(() => {
  //   if (!isAuthenticated) return
  //   if (pathname === '/day' || pathname === '/') {
  //     // DAYページにいる場合、TodoとRoutinesのデータをプリフェッチ
  //     prefetchTodos()
  //     prefetchHabits()
  //   } else if (pathname === '/todo') {
  //     // Todoページにいる場合、DAYとRoutinesのデータをプリフェッチ
  //     prefetchTimeBlocks(1)
  //     prefetchHabits()
  //   } else if (pathname === '/routines') {
  //     // Routinesページにいる場合、TodoとAnalyticsのデータをプリフェッチ
  //     prefetchTodos()
  //     prefetchEvaluations()
  //   } else if (pathname === '/analytics') {
  //     // Analyticsページにいる場合、RoutinesとDAYのデータをプリフェッチ
  //     prefetchHabits()
  //     prefetchTimeBlocks(1)
  //   }
  // }, [pathname, isAuthenticated, prefetchTimeBlocks, prefetchTodos, prefetchHabits, prefetchEvaluations])

  const handleMouseEnter = () => {
    // プリフェッチ機能を一時的に無効化
    // 認証されていない場合はプリフェッチしない
    // if (!isAuthenticated) return
    
    // ホバー時にデータをプリフェッチ
    // if (href === '/day') {
    //   prefetchTimeBlocks(1)
    //   prefetchTimeBlocks(2)
    //   prefetchTimeBlocks(3)
    // } else if (href === '/todo') {
    //   prefetchTodos()
    // } else if (href === '/routines') {
    //   prefetchHabits()
    // } else if (href === '/analytics') {
    //   prefetchEvaluations()
    // }
  }

  return (
    <nav className="bg-white border-t border-gray-200 flex items-center justify-around pt-2 pb-2 safe-bottom flex-shrink-0">
      {navigation.map((item) => {
        const isActive = pathname === item.href || (item.href === '/day' && pathname === '/')
        const Icon = item.icon
        
        return (
          <ViewTransitionLink
            key={item.name}
            href={item.href}
            prefetch={true}
            onMouseEnter={() => handleMouseEnter()}
            onTouchStart={() => handleMouseEnter()}
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