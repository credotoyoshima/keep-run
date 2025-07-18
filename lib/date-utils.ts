// 一日の始まり時間を考慮して、指定された時刻がどの日付に属するかを計算
export function getDateForDayStart(date: Date, dayStartTime: string): Date {
  const [startHour, startMinute] = dayStartTime.split(':').map(Number)
  
  // 日本時間に変換
  const jstOffset = 9 * 60 * 60 * 1000
  const jstDate = new Date(date.getTime() + jstOffset)
  
  const year = jstDate.getFullYear()
  const month = jstDate.getMonth()
  const day = jstDate.getDate()
  const hour = jstDate.getHours()
  const minute = jstDate.getMinutes()
  
  // 現在時刻が一日の始まり時間より前の場合、前日として扱う
  let targetDate = new Date(Date.UTC(year, month, day))
  
  if (hour < startHour || (hour === startHour && minute < startMinute)) {
    targetDate = new Date(Date.UTC(year, month, day - 1))
  }
  
  return targetDate
}

// 日本時間での「今日」を取得（一日の始まり時間を考慮）
export function getTodayInJST(dayStartTime: string): Date {
  return getDateForDayStart(new Date(), dayStartTime)
}

// 日付を YYYY-MM-DD 形式の文字列に変換
export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}