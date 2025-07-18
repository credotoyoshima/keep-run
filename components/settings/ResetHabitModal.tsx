'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, AlertTriangle } from 'lucide-react'

interface ResetHabitModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ResetHabitModal({ isOpen, onClose, onSuccess }: ResetHabitModalProps) {
  const [loading, setLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  if (!isOpen) return null

  const handleReset = async () => {
    if (confirmText !== 'リセット') return

    setLoading(true)
    try {
      const response = await fetch('/api/habits/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        alert('習慣がリセットされました。新しい習慣を設定できます。')
        onSuccess?.()
        onClose()
        // 習慣ページにリダイレクト
        window.location.href = '/routines'
      } else {
        const errorData = await response.json()
        alert(`リセットに失敗しました: ${errorData.error || '不明なエラー'}`)
      }
    } catch (error) {
      console.error('Error resetting habit:', error)
      alert('エラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">習慣をリセット</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">注意</p>
              <p>現在の習慣の進捗がすべて失われます。この操作は取り消せません。</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              習慣をリセットすると：
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>現在の習慣の記録がすべて削除されます</li>
              <li>達成日数が0にリセットされます</li>
              <li>新しい習慣を設定できるようになります</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              確認のため「リセット」と入力してください
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="リセット"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleReset}
            disabled={confirmText !== 'リセット' || loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? '処理中...' : 'リセットする'}
          </Button>
        </div>
      </div>
    </div>
  )
}