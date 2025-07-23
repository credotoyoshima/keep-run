'use client'

import { usePathname } from 'next/navigation'
import { LightDataLoader } from './LightDataLoader'

// プリフェッチを実行しないページのリスト
const NO_PREFETCH_PAGES = [
  '/',
  '/auth/login',
  '/auth/error', 
  '/auth/reset-password',
  '/auth/update-password',
  '/auth/callback'
]

export function ConditionalDataLoader() {
  const pathname = usePathname()
  
  // 認証ページとホームページではプリフェッチを実行しない
  if (NO_PREFETCH_PAGES.includes(pathname)) {
    return null
  }
  
  // 一時的にプリフェッチを無効化（本番環境のパフォーマンス改善のため）
  // TODO: パフォーマンスが安定したら再度有効化を検討
  return null
  
  // 高速化された軽量プリフェッチを実行
  // return <LightDataLoader />
}