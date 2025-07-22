'use client'

import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-2xl text-gray-400">404</span>
          </div>
          <h1 className="text-2xl font-light text-gray-900 mb-2">
            ページが見つかりません
          </h1>
          <p className="text-gray-600 mb-8">
            お探しのページは存在しないか、移動した可能性があります。
          </p>
        </div>
        
        <div className="space-y-3">
          <Link 
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Home size={18} />
            ホームに戻る
          </Link>
          
          <div className="text-center">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={16} />
              前のページに戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 