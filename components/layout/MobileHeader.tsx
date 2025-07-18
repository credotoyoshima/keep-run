'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Menu, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

interface MobileHeaderProps {
  title: string
  showBackButton?: boolean
}

export function MobileHeader({ title, showBackButton = false }: MobileHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  useEffect(() => {
    setIsMenuOpen(pathname.startsWith('/settings'))
  }, [pathname])
  
  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen)
    if (!isMenuOpen) {
      router.push('/settings')
    } else {
      router.back()
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-5 shadow-sm flex-shrink-0">
      <div className="w-8 h-8 flex items-center justify-center">
        {showBackButton && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => router.back()}
            className="p-0 h-8 w-8 text-black"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <h1 className="text-lg font-medium text-center flex-1 tracking-tight">
        {title}
      </h1>
      
      <div className="w-8 h-8 flex items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMenuToggle}
          className="p-0 h-8 w-8 text-black relative overflow-hidden flex items-center justify-center translate-y-1"
        >
          <div className="relative w-6 h-6">
            <Menu 
              className="absolute inset-0 h-6 w-6"
              style={{
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: isMenuOpen ? 0 : 1,
                transform: isMenuOpen ? 'rotate(90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
              }}
              strokeWidth={1.5}
            />
            <X 
              className="absolute inset-0 h-6 w-6"
              style={{
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: isMenuOpen ? 1 : 0,
                transform: isMenuOpen ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)',
              }}
              strokeWidth={1.5}
            />
          </div>
        </Button>
      </div>
    </header>
  )
}