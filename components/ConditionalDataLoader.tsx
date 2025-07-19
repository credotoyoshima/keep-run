'use client'

import { usePathname } from 'next/navigation'
import { InitialDataLoaderAuth } from './InitialDataLoaderAuth'

// プリフェッチを実行しないページのリスト
const NO_PREFETCH_PAGES = [
  '/auth/login',
  '/auth/error',
  '/auth/reset-password',
  '/auth/update-password',
  '/auth/callback'
]

export function ConditionalDataLoader() {
  const pathname = usePathname()
  
  // 認証ページではプリフェッチを実行しない
  if (NO_PREFETCH_PAGES.includes(pathname)) {
    return null
  }
  
  return <InitialDataLoaderAuth />
}