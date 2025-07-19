'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { MouseEvent, ReactNode } from 'react'

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
  const router = useRouter()
  const [, startTransition] = useTransition()

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // 速度最優先: View Transitionを無効化して高速化
    // 通常のNext.js Linkの動作に任せる
  }

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