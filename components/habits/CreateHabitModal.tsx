'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

interface CreateHabitModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onCreateHabit?: (habitData: { title: string; category: string; targetDays?: number }) => void
}

export function CreateHabitModal({ isOpen, onClose, onSuccess, onCreateHabit }: CreateHabitModalProps) {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) return

    setLoading(true)
    try {
      if (onCreateHabit) {
        // 親コンポーネントから渡されたcreateHabit関数を使用
        await onCreateHabit({
          title: title.trim(),
          category: 'other',
          targetDays: 14
        })
        onSuccess()
        setTitle('')
        onClose()
      } else {
        // フォールバック：直接APIを呼び出す
        const response = await fetch('/api/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            category: 'other',
            targetDays: 14
          })
        })

        if (response.ok) {
          onSuccess()
          setTitle('')
          onClose()
        } else {
          const error = await response.json()
          alert(error.error || '習慣の作成に失敗しました')
        }
      }
    } catch (error) {
      console.error('Error creating habit:', error)
      alert(error instanceof Error ? error.message : '習慣の作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-lg p-6 w-[90%] max-w-md">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 hover:bg-gray-100 rounded-lg"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-semibold mb-4">新しい習慣を追加</h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-red-600 mb-2">
              ここで決めたことを14日間継続します。
            </p>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="5分間、自宅の周りをウォーキングする"
              className="w-full"
              autoFocus
            />
            <div className="mt-2 text-xs text-gray-600 space-y-1">
              <p>5分以内に完了できるものを設定しましょう。</p>
              <p>禁酒、禁煙、デジタルデトックスなどの「しない事」を設定してもOKです。</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-black hover:bg-gray-800 text-white"
              disabled={!title.trim() || loading}
            >
              {loading ? '作成中...' : '作成'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}