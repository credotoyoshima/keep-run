'use client'

import { ReactNode } from 'react'
import { MobileHeader } from './MobileHeader'
import { BottomNavigation } from './BottomNavigation'
import { PullToRefresh } from '../ui/pull-to-refresh'

interface MobileLayoutProps {
  children: ReactNode
  title: string
  showBackButton?: boolean
  enablePullToRefresh?: boolean
  onRefresh?: () => Promise<void>
}

export function MobileLayout({ 
  children, 
  title, 
  showBackButton = false,
  enablePullToRefresh = true,
  onRefresh
}: MobileLayoutProps) {
  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col max-w-md mx-auto" style={{ height: '100dvh' }}>
      
      {/* App Header - Fixed at top */}
      <div className="flex-shrink-0">
        <MobileHeader 
          title={title} 
          showBackButton={showBackButton}
        />
      </div>
      
      {/* Content - scrollable area between header and bottom nav with Pull to Refresh */}
      <main className="flex-1 bg-gray-50 overflow-hidden">
        {enablePullToRefresh ? (
          <PullToRefresh 
            className="h-full"
            onRefresh={onRefresh}
          >
            <div className="h-full">
              {children}
            </div>
          </PullToRefresh>
        ) : (
          <div className="h-full overflow-y-auto overflow-x-hidden overscroll-contain">
            <div className="h-full">
              {children}
            </div>
          </div>
        )}
      </main>
      
      {/* Bottom Navigation - Fixed at bottom */}
      <div className="flex-shrink-0">
        <BottomNavigation />
      </div>
    </div>
  )
}