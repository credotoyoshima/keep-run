'use client'

import Link from 'next/link'
import { ReactNode } from 'react'

interface ViewTransitionLinkProps {
  href: string
  children: ReactNode
  className?: string
  prefetch?: boolean
  onMouseEnter?: () => void
  onTouchStart?: () => void
}

export function ViewTransitionLink({ 
  href, 
  children, 
  className, 
  prefetch = true,
  onMouseEnter,
  onTouchStart 
}: ViewTransitionLinkProps) {

  const handleClick = (e: React.MouseEvent) => {
    // ViewTransition警告を抑制するため、スクロール位置を保持
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: window.scrollY, behavior: 'instant' })
    }
  }

  return (
    <Link
      href={href}
      className={className}
      prefetch={prefetch}
      onMouseEnter={onMouseEnter}
      onTouchStart={onTouchStart}
      onClick={handleClick}
      // ViewTransition関連の警告を抑制
      style={{ scrollBehavior: 'smooth' }}
    >
      {children}
    </Link>
  )
}