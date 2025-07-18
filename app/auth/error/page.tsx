'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || '認証中にエラーが発生しました'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-center mb-6">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-semibold text-center mb-4">
          認証エラー
        </h1>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700 text-center">
            {decodeURIComponent(error)}
          </p>
        </div>
        
        <div className="space-y-3">
          <Link href="/" className="block">
            <Button className="w-full">
              ログインページに戻る
            </Button>
          </Link>
          
          <p className="text-sm text-gray-600 text-center">
            問題が続く場合は、サポートにお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  )
}