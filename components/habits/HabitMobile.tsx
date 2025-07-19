'use client'

import { useState, useEffect } from 'react'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { Button } from '@/components/ui/button'
import { CheckCircle, Plus, Circle } from 'lucide-react'
import { CreateHabitModal } from './CreateHabitModal'
import { HabitHistoryModal } from './HabitHistoryModal'
import { getTodayInJST, formatDateString } from '@/lib/date-utils'
import { useDayChangeDetection } from '@/lib/day-change-detector'
import { useDayStartTime } from '@/lib/hooks/useDayStartTime'
import { LoadingSpinnerCenter } from '@/components/ui/LoadingSpinner'
import { useContinuousHabits } from '@/lib/hooks/useContinuousHabits'

interface HabitRecord {
  date: string
  completed: boolean
}

interface ContinuousHabit {
  id: string
  title: string
  category: string
  startDate: string
  targetDays: number
  completedDays: number
  records: HabitRecord[]
  todayCompleted: boolean
  canCompleteToday: boolean
  shouldReset?: boolean
  isCompleted?: boolean
}

export function HabitMobile() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  
  // useDayStartTimeフックを使用
  const { dayStartTime } = useDayStartTime()

  // ReactQueryを使用して習慣データを取得・管理
  const {
    currentHabit,
    canCreateNew,
    isLoading: loading,
    createHabit,
    recordHabit,
    resetHabit,
    isCreating,
    isRecording,
    isResetting
  } = useContinuousHabits()

  // 日付変更を検出（ReactQueryが自動管理）
  useDayChangeDetection(dayStartTime, () => {
    console.log('Day changed, React Query will handle data refresh')
  })

  // 一時的な関数（ReactQuery移行完了後に削除）
  const fetchHabit = async () => {
    console.log('fetchHabit: ReactQuery移行待ち')
    // 元のfetch実装は一時的にコメントアウト
  }

  const setCurrentHabit = (habit: any) => {
    console.log('setCurrentHabit: ReactQuery移行待ち', habit)
    // 元のstate設定は一時的にコメントアウト
  }

  // 習慣をリセット
  const handleReset = async (habitId: string) => {
    try {
      const response = await fetch(`/api/habits/${habitId}/reset`, {
        method: 'POST'
      })
      
      if (response.ok) {
        alert('2日連続で未達成のため、振り出しに戻りました。')
        await fetchHabit()
      }
    } catch (error) {
      console.error('Error resetting habit:', error)
    }
  }

  // 習慣を完了
  const handleComplete = async (habitId: string) => {
    try {
      const response = await fetch(`/api/habits/${habitId}/complete`, {
        method: 'POST'
      })
      
      if (response.ok) {
        alert('おめでとうございます！14日間達成しました！新しい習慣を登録できます。')
        await fetchHabit()
      }
    } catch (error) {
      console.error('Error completing habit:', error)
    }
  }

  // 今日の日付を取得（一日の始まり時間を考慮）
  const getTodayDate = () => {
    const today = getTodayInJST(dayStartTime)
    return formatDateString(today)
  }


  // 習慣完了をトグル
  const toggleHabitCompletion = async () => {
    if (!currentHabit) return

    const today = getTodayDate()
    const todayRecord = currentHabit.records.find(r => r.date === today)
    
    // 今日すでに完了している場合は未完了に戻す、そうでない場合は完了にする
    const newCompleted = todayRecord?.completed ? false : true
    
    // 楽観的更新
    if (todayRecord) {
      const newRecords = currentHabit.records.map(r => 
        r.date === today ? { ...r, completed: newCompleted } : r
      )
      setCurrentHabit({
        ...currentHabit,
        records: newRecords,
        todayCompleted: newCompleted,
        completedDays: newCompleted 
          ? currentHabit.completedDays + 1 
          : currentHabit.completedDays - 1
      })
    } else {
      const newRecord = { date: today, completed: true }
      setCurrentHabit({
        ...currentHabit,
        records: [...currentHabit.records, newRecord],
        todayCompleted: true,
        completedDays: currentHabit.completedDays + 1
      })
    }

    try {
      const response = await fetch(`/api/habits/${currentHabit.id}/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: today, 
          completed: newCompleted,
          dayStartTime 
        })
      })

      if (!response.ok) {
        // エラーの場合は再読み込み
        await fetchHabit()
      }
    } catch (error) {
      console.error('Error toggling habit:', error)
      await fetchHabit()
    }
  }

  // 円形プログレスバーの値を計算
  const progressPercentage = currentHabit 
    ? Math.round((currentHabit.completedDays / currentHabit.targetDays) * 100)
    : 0

  // 今日完了済みかチェック
  const todayCompleted = currentHabit?.records.find(r => r.date === getTodayDate())?.completed || false



  if (loading) {
    return (
      <MobileLayout title="継続">
        <LoadingSpinnerCenter size="lg" />
      </MobileLayout>
    )
  }

  if (!currentHabit) {
    return (
      <MobileLayout title="継続">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Circle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <div className="text-gray-500 mb-6">
              {
                canCreateNew 
                  ? 'おめでとうございます！新しい習慣を設定できます。'
                  : 'さぁ、はじめよう。'
              }
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              習慣を追加
            </Button>
            
            {/* 今まで継続した習慣を見る */}
            <div className="mt-4">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="text-xs text-blue-600 underline hover:text-blue-700"
              >
                今まで継続した習慣を見る
              </button>
            </div>
            
            {/* ルール説明 */}
            <div className="mt-8 px-8">
              <div className="pt-4">
                <p className="text-xs font-medium text-gray-800 mb-2">ルール</p>
                <div className="text-xs text-gray-600 space-y-1 text-left">
                  <p>1）5分以内でできることを設定しよう。</p>
                  <p>2）2日連続で未達成の場合は、振出しに戻る。</p>
                  <p>3）14日間達成で、次の習慣を登録できます。</p>
                </div>
                <div className="border-t border-gray-300 mt-3 pt-3">
                  <div className="text-xs text-gray-700 space-y-1 text-center">
                    <p>小さな習慣を制する者が、人生を制するらしいで。</p>
                    <p className="font-medium">「俺はやるけど、お前はどうする？」</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <CreateHabitModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchHabit()
          }}
        />
        
        <HabitHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
        />
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="継続">
      <div className="flex flex-col h-full bg-gray-50">
        {/* メインコンテンツ */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-8">
          {/* 円形プログレスバー */}
          <div className="relative mb-8">
            <div className="relative w-80 h-80">
              {/* 背景の円 */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="6"
                  strokeDasharray={`${progressPercentage * 2.827} 283`}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              
              {/* 円の中央コンテンツ */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="text-lg font-medium text-gray-900 mb-2 px-4">
                  {currentHabit.title}
                </div>
                {todayCompleted && (
                  <div className="text-sm text-blue-600 font-medium mb-2">
                    Done!
                  </div>
                )}
                {currentHabit.isCompleted && (
                  <div className="text-sm text-green-600 font-medium mb-2">
                    達成！
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  {currentHabit.completedDays} / {currentHabit.targetDays}
                </div>
              </div>
            </div>
          </div>

                     {/* タップボタン */}
           <div className="mb-4">
             <Button
               size="lg"
               className="px-6 py-4 rounded-lg text-white font-medium bg-black hover:bg-gray-800"
               onClick={toggleHabitCompletion}
             >
               {todayCompleted ? (
                 <span className="flex items-center gap-2">
                   <CheckCircle className="h-5 w-5" />
                   達成済み
                 </span>
               ) : (
                 '達成'
               )}
             </Button>
           </div>

           {/* 継続できた習慣を見るボタン */}
           <div className="mb-3">
             <button
               onClick={() => setShowHistoryModal(true)}
               className="text-blue-600 hover:text-blue-700 underline text-xs"
             >
               今まで継続した習慣を見る
             </button>
           </div>
           
           {/* ルール説明 */}
           <div className="px-8">
             <div className="pt-4">
               <p className="text-xs font-medium text-gray-800 mb-2">ルール</p>
               <div className="text-xs text-gray-600 space-y-1 text-left">
                 <p>1）5分以内でできることを設定しよう。</p>
                 <p>2）2日連続で未達成の場合は、振出しに戻る。</p>
                 <p>3）14日間達成で、次の習慣を登録できます。</p>
               </div>
               <div className="border-t border-gray-300 mt-3 pt-3">
                 <div className="text-xs text-gray-700 space-y-1 text-center">
                   <p>小さな習慣を制する者が、人生を制するらしいで。</p>
                   <p className="font-medium">「俺はやるけど、お前はどうする？」</p>
                 </div>
               </div>
             </div>
           </div>
         </div>
      </div>
      
      <CreateHabitModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false)
          fetchHabit()
        }}
      />
      
      <HabitHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />
    </MobileLayout>
  )
}