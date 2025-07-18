'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface DayStartTimeModalProps {
  isOpen: boolean
  onClose: () => void
  currentTime: string
  onSave: (time: string) => void
}

export function DayStartTimeModal({ isOpen, onClose, currentTime, onSave }: DayStartTimeModalProps) {
  const [selectedTime, setSelectedTime] = useState(currentTime)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSelectedTime(currentTime)
    }
  }, [isOpen, currentTime])

  const handleSave = async () => {
    setLoading(true)
    setMessage('')

    try {
      onSave(selectedTime)
      setMessage('設定を保存しました')
      setTimeout(() => {
        onClose()
        setMessage('')
      }, 1500)
    } catch (error) {
      setMessage('保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const hours = selectedTime.split(':')[0]
  const minutes = selectedTime.split(':')[1]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>一日の始まり時間</DialogTitle>
          <DialogDescription>
            設定した時間を基準に、時間ブロックが並び替えられます
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>開始時刻</Label>
            <div className="flex gap-2 items-center">
              <select
                value={hours}
                onChange={(e) => {
                  setSelectedTime(`${e.target.value}:${minutes}`)
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0')
                  return (
                    <option key={hour} value={hour}>
                      {hour}時
                    </option>
                  )
                })}
              </select>
              <span className="text-gray-500">:</span>
              <select
                value={minutes}
                onChange={(e) => {
                  setSelectedTime(`${hours}:${e.target.value}`)
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                {Array.from({ length: 6 }, (_, i) => {
                  const minute = (i * 10).toString().padStart(2, '0')
                  return (
                    <option key={minute} value={minute}>
                      {minute}分
                    </option>
                  )
                })}
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              例：5:00に設定すると、4:00のブロックは一日の最後に表示されます
            </p>
          </div>

          {message && (
            <div className={`text-sm ${message.includes('失敗') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button
            className="flex-1 bg-black hover:bg-gray-800 text-white"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? '保存中...' : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}