'use client'

import { useState, useEffect, useRef } from 'react'

interface TimePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (time: string) => void
  initialTime?: string
}

export function TimePickerModal({ isOpen, onClose, onSelect, initialTime = '00:00' }: TimePickerModalProps) {
  const [selectedHour, setSelectedHour] = useState(0)
  const [selectedMinute, setSelectedMinute] = useState(0)
  const hourRef = useRef<HTMLDivElement>(null)
  const minuteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialTime) {
      const [hour, minute] = initialTime.split(':').map(Number)
      setSelectedHour(hour)
      setSelectedMinute(minute)
    }
  }, [initialTime])

  useEffect(() => {
    if (isOpen && hourRef.current && minuteRef.current) {
      // 初期スクロール位置を設定（上部スペーサーを考慮）
      setTimeout(() => {
        if (hourRef.current) {
          const hourIndex = selectedHour
          hourRef.current.scrollTop = hourIndex * 48
        }
        
        if (minuteRef.current) {
          const minutes = [0, 10, 20, 30, 40, 50]
          const minuteIndex = minutes.indexOf(selectedMinute)
          if (minuteIndex !== -1) {
            minuteRef.current.scrollTop = minuteIndex * 48
          }
        }
      }, 50)
    }
  }, [isOpen])

  const handleHourScroll = () => {
    if (!hourRef.current) return
    const scrollTop = hourRef.current.scrollTop
    const index = Math.round(scrollTop / 48)
    const newHour = Math.max(0, Math.min(23, index))
    if (newHour !== selectedHour) {
      setSelectedHour(newHour)
    }
  }

  const handleMinuteScroll = () => {
    if (!minuteRef.current) return
    const scrollTop = minuteRef.current.scrollTop
    const index = Math.round(scrollTop / 48)
    const minutes = [0, 10, 20, 30, 40, 50]
    if (index >= 0 && index < minutes.length) {
      const newMinute = minutes[index]
      if (newMinute !== selectedMinute) {
        setSelectedMinute(newMinute)
      }
    }
  }

  if (!isOpen) return null

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = [0, 10, 20, 30, 40, 50]

  const handleConfirm = () => {
    const formattedHour = selectedHour.toString().padStart(2, '0')
    const formattedMinute = selectedMinute.toString().padStart(2, '0')
    onSelect(`${formattedHour}:${formattedMinute}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center pb-20 md:pb-0" role="dialog">
      {/* 背景のオーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        style={{ 
          clipPath: 'inset(0 0 80px 0)' // ボトムメニューの高さ分を切り取る
        }}
      />
      
      {/* モーダル本体 */}
      <div className="relative bg-black rounded-t-3xl md:rounded-3xl w-full max-w-md md:mx-auto shadow-2xl animate-slide-up">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <button
            onClick={onClose}
            className="text-gray-400 font-medium hover:text-white transition-colors"
          >
            キャンセル
          </button>
          <h3 className="text-lg font-medium text-white">時刻を選択</h3>
          <button
            onClick={handleConfirm}
            className="text-white font-medium bg-white/10 px-4 py-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            完了
          </button>
        </div>

        {/* ピッカー本体 */}
        <div className="flex h-36 bg-black relative">
          {/* 選択インジケーター（背面に配置） */}
          <div className="absolute top-[3rem] left-0 right-0 h-12 border-t border-b border-white/20 pointer-events-none z-0 bg-white/5" />

          {/* 時間選択 */}
          <div 
            className="flex-1 overflow-y-auto scrollbar-hide snap-y snap-mandatory" 
            ref={hourRef}
            onScroll={handleHourScroll}
            style={{ scrollSnapType: 'y mandatory' }}
          >
            <div className="h-12" /> {/* 上部スペーサー */}
            {hours.map((hour) => (
              <button
                key={hour}
                onClick={() => {
                  setSelectedHour(hour)
                  if (hourRef.current) {
                    hourRef.current.scrollTop = hour * 48
                  }
                }}
                className={`w-full h-12 flex items-center justify-center snap-center transition-all duration-200 ${
                  selectedHour === hour
                    ? 'text-white text-xl font-normal'
                    : 'text-gray-500 text-base'
                }`}
                style={{ scrollSnapAlign: 'center' }}
              >
                {hour.toString().padStart(2, '0')}
              </button>
            ))}
            <div className="h-12" /> {/* 下部スペーサー */}
          </div>

          {/* 区切り文字 */}
          <div className="flex items-center px-2">
            <span className="text-2xl font-extralight text-gray-400">:</span>
          </div>

          {/* 分選択 */}
          <div 
            className="flex-1 overflow-y-auto scrollbar-hide snap-y snap-mandatory" 
            ref={minuteRef}
            onScroll={handleMinuteScroll}
            style={{ scrollSnapType: 'y mandatory' }}
          >
            <div className="h-12" /> {/* 上部スペーサー */}
            {minutes.map((minute) => (
              <button
                key={minute}
                onClick={() => {
                  setSelectedMinute(minute)
                  if (minuteRef.current) {
                    const minuteIndex = minutes.indexOf(minute)
                    minuteRef.current.scrollTop = minuteIndex * 48
                  }
                }}
                className={`w-full h-12 flex items-center justify-center snap-center transition-all duration-200 ${
                  selectedMinute === minute
                    ? 'text-white text-xl font-normal'
                    : 'text-gray-500 text-base'
                }`}
                style={{ scrollSnapAlign: 'center' }}
              >
                {minute.toString().padStart(2, '0')}
              </button>
            ))}
            <div className="h-12" /> {/* 下部スペーサー */}
          </div>
        </div>
      </div>
    </div>
  )
}