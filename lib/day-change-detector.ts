import { useEffect, useRef, useCallback } from 'react'

/**
 * 日付変更を検出するカスタムフック
 * @param dayStartTime - 一日の始まりの時間 (HH:mm形式)
 * @param onDayChange - 日付が変わった時に実行されるコールバック
 */
export function useDayChangeDetection(
  dayStartTime: string,
  onDayChange: () => void
) {
  const lastCheckedDateRef = useRef<string>('')
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null)

  // 現在の日付を取得（dayStartTimeを考慮）
  const getCurrentDate = useCallback(() => {
    const now = new Date()
    const [hours, minutes] = dayStartTime.split(':').map(Number)
    const dayStart = new Date(now)
    dayStart.setHours(hours, minutes, 0, 0)

    // 現在時刻が一日の始まりより前の場合は前日とする
    if (now < dayStart) {
      now.setDate(now.getDate() - 1)
    }

    return now.toDateString()
  }, [dayStartTime])

  // 日付変更をチェック
  const checkDayChange = useCallback(() => {
    const currentDate = getCurrentDate()
    
    if (lastCheckedDateRef.current && lastCheckedDateRef.current !== currentDate) {
      console.log('Day changed detected:', lastCheckedDateRef.current, '->', currentDate)
      onDayChange()
    }
    
    lastCheckedDateRef.current = currentDate
    localStorage.setItem('lastCheckedDate', currentDate)
  }, [getCurrentDate, onDayChange])

  useEffect(() => {
    // 初回チェック（初回起動時にも日付変更をチェック）
    const currentDate = getCurrentDate()
    
    // localStorageから前回の日付を取得
    const lastSavedDate = localStorage.getItem('lastCheckedDate')
    if (lastSavedDate && lastSavedDate !== currentDate) {
      console.log('Day changed since last visit:', lastSavedDate, '->', currentDate)
      onDayChange()
    }
    
    lastCheckedDateRef.current = currentDate
    localStorage.setItem('lastCheckedDate', currentDate)

    // 1分ごとにチェック
    intervalIdRef.current = setInterval(checkDayChange, 60 * 1000)

    // ページがフォーカスされた時もチェック
    const handleFocus = () => {
      checkDayChange()
    }

    // visibility changeイベント（バックグラウンドタブから戻った時）
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkDayChange()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current)
      }
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [getCurrentDate, checkDayChange])
}