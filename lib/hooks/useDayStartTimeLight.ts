import { useState, useEffect } from 'react'

const DEFAULT_DAY_START_TIME = '05:00'

// 軽量版: localStorageのみ使用、APIは呼び出さない
export function useDayStartTimeLight() {
  const [dayStartTime, setDayStartTime] = useState<string>(DEFAULT_DAY_START_TIME)
  const [isLoading, setIsLoading] = useState(false) // 常にfalse

  useEffect(() => {
    // localStorageから読み込み（API呼び出しなし）
    if (typeof window !== 'undefined') {
      const localValue = localStorage.getItem('dayStartTime')
      if (localValue) {
        setDayStartTime(localValue)
      }
    }
    setIsLoading(false)
  }, [])

  // 設定更新（localStorageのみ）
  const updateDayStartTime = (newTime: string) => {
    setDayStartTime(newTime)
    if (typeof window !== 'undefined') {
      localStorage.setItem('dayStartTime', newTime)
    }
  }

  return {
    dayStartTime,
    updateDayStartTime,
    isLoading,
    error: null
  }
} 