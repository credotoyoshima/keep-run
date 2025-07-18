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
    <div className="h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative overflow-hidden">
      
      {/* App Header */}
      <MobileHeader 
        title={title} 
        showBackButton={showBackButton}
      />
      
      {/* Content - scrollable area between header and bottom nav */}
      <main className="flex-1 bg-gray-50 overflow-y-auto">
        {children}
      </main>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}