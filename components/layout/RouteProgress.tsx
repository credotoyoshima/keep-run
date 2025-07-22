'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function RouteProgress() {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // シンプルなローディング表示（タイマー削減）
    setIsLoading(true)
    
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 200) // 短縮

    return () => clearTimeout(timer)
  }, [pathname])

  if (!isLoading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-black" />
  )
}