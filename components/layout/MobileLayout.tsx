'use client'

import { ReactNode } from 'react'
import { MobileHeader } from './MobileHeader'
import { BottomNavigation } from './BottomNavigation'

interface MobileLayoutProps {
  children: ReactNode
  title: string
  showBackButton?: boolean
}

export function MobileLayout({ children, title, showBackButton = false }: MobileLayoutProps) {
  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col max-w-md mx-auto" style={{ height: '100dvh' }}>
      
      {/* App Header - Fixed at top */}
      <div className="flex-shrink-0">
        <MobileHeader 
          title={title} 
          showBackButton={showBackButton}
        />
      </div>
      
      {/* Content - scrollable area between header and bottom nav */}
      <main className="flex-1 bg-gray-50 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="h-full">
          {children}
        </div>
      </main>
      
      {/* Bottom Navigation - Fixed at bottom */}
      <div className="flex-shrink-0">
        <BottomNavigation />
      </div>
    </div>
  )
}