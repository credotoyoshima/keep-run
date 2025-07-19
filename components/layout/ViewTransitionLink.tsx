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
  const [isPending, startTransition] = useTransition()

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    
    // View Transitions APIが利用可能な場合
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        startTransition(() => {
          router.push(href)
        })
      })
    } else {
      // フォールバック
      startTransition(() => {
        router.push(href)
      })
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={className}
      prefetch={prefetch}
      onMouseEnter={onMouseEnter}
      onTouchStart={onTouchStart}
    >
      {children}
    </Link>
  )
}