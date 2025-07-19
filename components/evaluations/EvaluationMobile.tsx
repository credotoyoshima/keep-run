'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinnerCenter } from '@/components/ui/LoadingSpinner'
import { 
  Star, 
  ChevronLeft,
  ChevronRight,
  Calendar,
  X
} from 'lucide-react'
import { useSimpleEvaluations } from '@/lib/hooks/useSimpleEvaluations'

interface Evaluation {
  id: string
  date: string
  rating: number
  comment: string
  title: string
}

export function EvaluationMobile() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showEvaluationForm, setShowEvaluationForm] = useState(false)
  const [newRating, setNewRating] = useState(0)
  const [newComment, setNewComment] = useState('')

  // ReactQueryを使用して評価データを取得・管理
  const { 
    evaluations, 
    isLoading: loading, 
    saveEvaluation, 
    isSaving: saving 
  } = useSimpleEvaluations()

  // 評価データ取得は不要（ReactQueryが自動管理）

  // 月の名前を取得
  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
  }

  // 曜日の配列
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']

  // 今日の日付を取得（タイムゾーン考慮）
  const getTodayString = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // カレンダーの日付を生成
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const totalDays = 42 // 6週間分
    const todayString = getTodayString()
    
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`
      
      const evaluation = evaluations.find(e => e.date === dateString)
      const isCurrentMonth = date.getMonth() === currentDate.getMonth()
      const isToday = dateString === todayString
      
      // 未来の日付かどうかを判定
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const calendarDate = new Date(date)
      calendarDate.setHours(0, 0, 0, 0)
      const isFuture = calendarDate > today
      
      days.push({
        date: date.getDate(),
        dateString,
        isCurrentMonth,
        isToday,
        evaluation,
        isFuture
      })
    }
    
    return days
  }



  // 月を変更
  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  // 31日前から当日までの期間を計算
  const getLast31Days = () => {
    const today = new Date()
    const thirtyOneDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    return { start: thirtyOneDaysAgo, end: today }
  }

  // 評価データを31日前から当日までフィルタリングして月ごとにグループ化
  const getRecentEvaluations = () => {
    const { start, end } = getLast31Days()
    const filteredEvaluations = evaluations.filter(evaluation => {
      const evalDate = new Date(evaluation.date)
      return evalDate >= start && evalDate <= end
    })

    // 日付順でソート（新しい順）
    const sortedEvaluations = filteredEvaluations.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    // 月ごとにグループ化
    const groupedEvaluations = sortedEvaluations.reduce((groups, evaluation) => {
      const date = new Date(evaluation.date)
      const yearMonth = `${date.getFullYear()}年 ${date.getMonth() + 1}月`
      if (!groups[yearMonth]) {
        groups[yearMonth] = []
      }
      groups[yearMonth].push(evaluation)
      return groups
    }, {} as Record<string, typeof evaluations>)

    return groupedEvaluations
  }

  // 日付を選択
  const selectDate = (dateString: string, clickedElement: HTMLElement) => {
    // 今日より先の日付の場合は編集画面を表示しない（編集画面が開いている場合は閉じる）
    const selectedDate = new Date(dateString)
    const today = new Date()
    // 日付のみを比較するため、時刻を00:00:00に設定
    today.setHours(0, 0, 0, 0)
    selectedDate.setHours(0, 0, 0, 0)
    
    if (selectedDate > today) {
      if (showEvaluationForm) {
        cancelEvaluation()
      }
      return // 未来の日付の場合は編集画面を閉じて終了
    }
    
    // 即座に DOM を操作して視覚的フィードバック
    const allButtons = document.querySelectorAll('[data-calendar-day]')
    allButtons.forEach(btn => {
      const button = btn as HTMLElement
      button.style.border = ''
      button.style.backgroundColor = ''
      // 今日の日付のグレー背景を復元
      const dayString = button.getAttribute('data-date-string')
      const todayString = getTodayString()
      if (dayString === todayString && dayString !== dateString) {
        button.style.backgroundColor = '#e5e7eb'
      }
    })
    
    // クリックした要素に即座にスタイルを適用
    clickedElement.style.border = '2px solid black'
    clickedElement.style.backgroundColor = '#f9fafb'
    
    // 状態更新（レンダリング用）
    setSelectedDate(dateString)
    
    // フォームデータを準備
    const evaluation = evaluations.find(e => e.date === dateString)
    const rating = evaluation?.rating || 0
    const comment = evaluation?.comment || ''
    
    // 一括で状態更新
    setNewRating(rating)
    setNewComment(comment)
    setShowEvaluationForm(true)
  }

  // 評価を保存（ReactQuery版）
  const handleSaveEvaluation = () => {
    if (!selectedDate || newRating === 0 || saving) return

    saveEvaluation({
      date: selectedDate,
      rating: newRating,
      comment: newComment
    }, {
      onSuccess: () => {
        setShowEvaluationForm(false)
        setSelectedDate(null)
        setNewRating(0)
        setNewComment('')
      },
      onError: (error) => {
        console.error('Error saving evaluation:', error)
        alert('エラーが発生しました。もう一度お試しください。')
      }
    })
  }

  // 評価をキャンセル
  const cancelEvaluation = () => {
    setShowEvaluationForm(false)
    setSelectedDate(null)
    setNewRating(0)
    setNewComment('')
  }

  // 今日に戻る
  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    const todayString = getTodayString()
    
    // 今日の日付ボタンを探して選択
    setTimeout(() => {
      const todayButton = document.querySelector(`[data-date-string="${todayString}"]`) as HTMLElement
      if (todayButton) {
        selectDate(todayString, todayButton)
      }
    }, 0)
  }

  // 星をレンダリング
  const renderStars = (rating: number, interactive = false, onRate?: (rating: number) => void, size = 'h-5 w-5') => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            className={`${interactive ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={() => onRate && onRate(star)}
          >
            <Star 
              className={`${size} ${
                star <= rating 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-gray-300'
              }`} 
            />
          </button>
        ))}
      </div>
    )
  }

  const calendarDays = generateCalendarDays()

  if (loading) {
    return (
      <MobileLayout title="評価">
        <LoadingSpinnerCenter size="lg" />
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="評価">
      <div 
        className="p-5 pb-0"
        onClick={(e) => {
          // 編集画面が開いている場合のみ、カレンダー外の空白部分をクリックしたら閉じる
          if (showEvaluationForm && e.target === e.currentTarget) {
            cancelEvaluation()
          }
        }}
      >
        {/* Calendar Header */}
        <div 
          className="bg-white rounded-lg border border-gray-200 p-4 mb-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center mb-4 relative">
            <div className="flex items-center">
              <button
                onClick={() => changeMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900 mx-2">
                {getMonthName(currentDate)}
              </h2>
              <button
                onClick={() => changeMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <Button
              onClick={goToToday}
              size="sm"
              className="absolute right-0 text-xs px-2 py-1 h-6 bg-black text-white hover:bg-gray-800"
            >
              今日
            </Button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekdays.map((day) => (
              <div key={day} className="text-center text-xs text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 border border-gray-200 rounded-lg overflow-hidden">
            {calendarDays.map((day, index) => (
              <button
                key={index}
                data-calendar-day="true"
                data-date-string={day.dateString}
                onClick={(e) => {
                  if (day.isCurrentMonth && !day.isFuture) {
                    selectDate(day.dateString, e.currentTarget)
                  } else if (showEvaluationForm) {
                    // 他の月の日付や未来の日付をクリックした場合は編集画面を閉じる
                    cancelEvaluation()
                  }
                }}
                style={{
                  border: selectedDate === day.dateString ? '2px solid black' : undefined,
                  backgroundColor: selectedDate === day.dateString ? '#f9fafb' : 
                                 (day.isToday && selectedDate !== day.dateString) ? '#e5e7eb' : undefined
                }}
                className={`
                  relative h-12 flex flex-col items-center justify-center text-sm z-10
                  ${selectedDate !== day.dateString
                    ? `border-r border-b border-gray-200 last:border-r-0 ${index >= calendarDays.length - 7 ? 'border-b-0' : ''}`
                    : ''
                  }
                  ${day.isCurrentMonth 
                    ? day.isFuture 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-gray-900 hover:bg-gray-100 cursor-pointer' 
                    : 'text-gray-300'
                  }
                `}
              >
                <div className="flex items-center justify-center mb-1">
                  {day.date}
                </div>
                
                {/* 評価の星表示（星が無い場合は空のスペース） */}
                <div className="flex items-center justify-center mb-0.5 h-4">
                  {day.evaluation ? (
                    <>
                      <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs ml-0.5 text-gray-600">
                        {day.evaluation.rating}
                      </span>
                    </>
                  ) : (
                    <div className="h-2.5" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Evaluation Form */}
        {showEvaluationForm && (
          <div 
            className="bg-white rounded-lg border border-gray-200 p-4 mb-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {selectedDate && new Date(selectedDate).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEvaluation}
                  disabled={newRating === 0 || saving}
                  className="bg-black hover:bg-gray-800 text-white text-xs px-3 py-1 rounded disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={cancelEvaluation}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Rating */}
              <div className="flex items-center justify-start gap-4">
                <label className="text-sm font-medium text-gray-700">
                  評価
                </label>
                <div className="flex">
                  {renderStars(newRating, true, setNewRating)}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  コメント
                </label>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="今日の振り返りを記録してください"
                  className="w-full h-16 text-xs"
                />
              </div>


            </div>
          </div>
        )}

                {/* Recent Evaluations */}
        <div className="space-y-2 mb-20">
          {(() => {
            const groupedEvaluations = getRecentEvaluations()
            const hasEvaluations = Object.keys(groupedEvaluations).length > 0
            
            if (!hasEvaluations) {
              return (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <div className="text-gray-500 mb-2">評価がありません</div>
                  <div className="text-sm text-gray-400">
                    カレンダーの日付をタップして記録を始めましょう
                  </div>
                </div>
              )
            }

            return Object.entries(groupedEvaluations).map(([yearMonth, evaluations]) => (
              <div key={yearMonth}>
                {/* 年月の帯 */}
                <div className="bg-black px-4 py-2 text-sm font-medium text-white sticky top-0 z-10">
                  {yearMonth}
                </div>
                
                {/* 評価リスト */}
                <div className="space-y-2 pt-2">
                  {evaluations.map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="bg-white rounded-lg border border-gray-200 pl-5 pr-3 py-2 cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        // 対応するカレンダーの日付ボタンを探す
                        const calendarButton = document.querySelector(`[data-date-string="${evaluation.date}"]`) as HTMLElement
                        if (calendarButton) {
                          selectDate(evaluation.date, calendarButton)
                        }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {/* 左側：日付部分 */}
                        <div className="flex-shrink-0 text-center" style={{ transform: 'translateY(-2px)' }}>
                          <div className="text-2xl font-bold text-gray-900">
                            {new Date(evaluation.date).getDate()}
                          </div>
                          <div className="text-xs text-gray-900 mt-1">
                            {new Date(evaluation.date).toLocaleDateString('ja-JP', {
                              weekday: 'short'
                            })}
                          </div>
                        </div>
                        
                        {/* 右側：コンテンツ部分 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-start mb-1">
                            <div className="flex items-center">
                              {renderStars(evaluation.rating, false, undefined, 'h-4 w-4')}
                            </div>
                          </div>
                          
                          {evaluation.comment && (
                            <div className="text-xs text-gray-600 leading-relaxed">
                              {evaluation.comment}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()}
        </div>
      </div>
    </MobileLayout>
  )
}