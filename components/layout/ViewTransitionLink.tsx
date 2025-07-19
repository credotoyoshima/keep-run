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

  return (
    <Link
      href={href}
      className={className}
      prefetch={prefetch}
      onMouseEnter={onMouseEnter}
      onTouchStart={onTouchStart}
    >
      {children}
    </Link>
  )
}