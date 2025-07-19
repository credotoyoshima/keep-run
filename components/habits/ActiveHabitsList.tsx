'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, CheckCircle, XCircle, Archive, Calendar } from 'lucide-react'
import { format, subDays, isToday, startOfToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Database } from '@/lib/supabase/types'

type ContinuousHabit = Database['public']['Tables']['ContinuousHabit']['Row']
type HabitRecord = Database['public']['Tables']['HabitRecord']['Row']

type HabitWithRecords = ContinuousHabit & {
  records: HabitRecord[]
}

interface ActiveHabitsListProps {
  habits: HabitWithRecords[]
  onRecordCompletion: (habitId: string, date: Date, completed: boolean) => void
  onCompleteHabit: (habitId: string, status: 'completed' | 'failed' | 'abandoned') => void
  loading: boolean
}

export function ActiveHabitsList({ 
  habits, 
  onRecordCompletion, 
  onCompleteHabit, 
  loading 
}: ActiveHabitsListProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'exercise': return '🏃'
      case 'health': return '💪'
      case 'learning': return '📚'
      default: return '🎯'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'exercise': return '運動'
      case 'health': return '健康'
      case 'learning': return '学習'
      default: return 'その他'
    }
  }

  const calculateProgress = (habit: HabitWithRecords) => {
    const completedDays = habit.records.filter(record => record.completed).length
    return Math.min((completedDays / habit.targetDays) * 100, 100)
  }

  const getCurrentStreak = (habit: HabitWithRecords) => {
    const sortedRecords = habit.records
      .filter(r => r.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    let streak = 0
    const today = startOfToday()
    
    for (let i = 0; i < habit.targetDays; i++) {
      const checkDate = subDays(today, i)
      const dateString = checkDate.toISOString().split('T')[0]
      const hasRecord = sortedRecords.some(r => r.date === dateString)
      
      if (hasRecord) {
        streak++
      } else if (i === 0 && !isToday(checkDate)) {
        continue
      } else {
        break
      }
    }
    
    return streak
  }

  const getDayStatus = (habit: HabitWithRecords, date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    const record = habit.records.find(r => r.date === dateString)
    return record?.completed || false
  }

  const getDaysToShow = (habit: HabitWithRecords) => {
    const days = []
    const today = startOfToday()
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i)
      days.push({
        date,
        completed: getDayStatus(habit, date),
        isToday: isToday(date)
      })
    }
    
    return days
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (habits.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          アクティブな習慣がありません
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {habits.map((habit) => {
        const progress = calculateProgress(habit)
        const streak = getCurrentStreak(habit)
        const completedDays = habit.records.filter(r => r.completed).length
        const daysToShow = getDaysToShow(habit)
        
        return (
          <Card key={habit.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getCategoryIcon(habit.category)}</span>
                  <div>
                    <CardTitle className="text-lg">{habit.title}</CardTitle>
                    <CardDescription>
                      <Badge variant="outline" className="mr-2">
                        {getCategoryLabel(habit.category)}
                      </Badge>
                      {completedDays}/{habit.targetDays} 日完了 • {streak} 日連続
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => onCompleteHabit(habit.id, 'completed')}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      目標達成
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onCompleteHabit(habit.id, 'failed')}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      失敗で終了
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onCompleteHabit(habit.id, 'abandoned')}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      中断
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">進捗</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(progress)}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              
              <div>
                <div className="text-sm font-medium mb-2">過去7日間</div>
                <div className="flex gap-1">
                  {daysToShow.map((day, index) => (
                    <div key={index} className="flex flex-col items-center gap-1">
                      <div className="text-xs text-muted-foreground">
                        {format(day.date, 'E', { locale: ja })}
                      </div>
                      <button
                        onClick={() => onRecordCompletion(habit.id, day.date, !day.completed)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                          day.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : day.isToday
                            ? 'border-blue-500 hover:bg-blue-50'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {day.completed && <CheckCircle className="h-4 w-4" />}
                        {day.isToday && !day.completed && <Calendar className="h-4 w-4" />}
                      </button>
                      <div className="text-xs text-muted-foreground">
                        {format(day.date, 'd')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}