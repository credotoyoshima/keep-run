'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface HabitHistory {
  id: string
  title: string
  startDate: string
  endDate: string
  completedDays: number
}

interface HabitHistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HabitHistoryModal({ isOpen, onClose }: HabitHistoryModalProps) {
  const [history, setHistory] = useState<HabitHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchHistory()
    }
  }, [isOpen])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/habits/history')
      if (response.ok) {
        const data = await response.json()
        setHistory(data)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
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
      <div className="relative bg-white rounded-lg p-6 w-[90%] max-w-md max-h-[70vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">今まで達成した習慣</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              まだ達成した習慣がありません
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600">
                    期間: {item.startDate} 〜 {item.endDate}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}