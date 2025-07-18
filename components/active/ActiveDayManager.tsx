'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Calendar, Plus, Clock } from 'lucide-react'
import { CreateActiveDayDialog } from './CreateActiveDayDialog'
import { ActiveTimeBlockCard } from './ActiveTimeBlockCard'
import { Database } from '@/lib/supabase/types'

type ActiveDay = Database['public']['Tables']['ActiveDay']['Row']
type ActiveTimeBlock = Database['public']['Tables']['ActiveTimeBlock']['Row']
type ActiveTask = Database['public']['Tables']['ActiveTask']['Row']

type ActiveDayWithBlocks = ActiveDay & {
  timeBlocks: (ActiveTimeBlock & {
    tasks: ActiveTask[]
  })[]
}

export function ActiveDayManager() {
  const [activeDay, setActiveDay] = useState<ActiveDayWithBlocks | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchActiveDay()
  }, [])

  const fetchActiveDay = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('ActiveDay')
      .select(`
        *,
        timeBlocks:ActiveTimeBlock(
          *,
          tasks:ActiveTask(*)
        )
      `)
      .eq('userId', user.id)
      .eq('date', today)
      .single()

    if (!error && data) {
      setActiveDay(data as ActiveDayWithBlocks)
    }
    setLoading(false)
  }

  const calculateOverallProgress = () => {
    if (!activeDay) return 0
    
    let totalTasks = 0
    let completedTasks = 0
    
    activeDay.timeBlocks.forEach(block => {
      totalTasks += block.tasks.length
      completedTasks += block.tasks.filter(task => task.completed).length
    })
    
    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  }

  const updateTaskCompletion = async (taskId: string, completed: boolean) => {
    const { error } = await supabase
      .from('ActiveTask')
      .update({ 
        completed,
        updatedAt: new Date().toISOString()
      })
      .eq('id', taskId)

    if (!error) {
      await updateBlockCompletionRate(taskId)
      fetchActiveDay()
    }
  }

  const updateBlockCompletionRate = async (taskId: string) => {
    if (!activeDay) return

    const block = activeDay.timeBlocks.find(b => 
      b.tasks.some(t => t.id === taskId)
    )
    
    if (!block) return

    const completedTasks = block.tasks.filter(t => 
      t.id === taskId ? !t.completed : t.completed
    ).length + (block.tasks.find(t => t.id === taskId)?.completed ? 0 : 1)
    
    const completionRate = block.tasks.length > 0 
      ? (completedTasks / block.tasks.length) * 100 
      : 0

    await supabase
      .from('ActiveTimeBlock')
      .update({ 
        completionRate,
        updatedAt: new Date().toISOString()
      })
      .eq('id', block.id)
  }

  if (loading) {
    return <div>読み込み中...</div>
  }

  if (!activeDay) {
    return (
      <div className="text-center space-y-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle>今日の予定なし</CardTitle>
            <CardDescription>
              今日の予定を作成して、効率的に一日を過ごしましょう
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowCreateDialog(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              今日の予定を作成
            </Button>
          </CardContent>
        </Card>
        <CreateActiveDayDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreated={fetchActiveDay}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {new Date().toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </CardTitle>
              <CardDescription>
                {activeDay.timeBlocks.length} 個のタイムブロック
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {Math.round(calculateOverallProgress())}%
              </div>
              <div className="text-sm text-muted-foreground">完了</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={calculateOverallProgress()} className="h-3" />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {activeDay.timeBlocks
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((block) => (
            <ActiveTimeBlockCard
              key={block.id}
              block={block}
              onTaskToggle={updateTaskCompletion}
            />
          ))}
      </div>

      <CreateActiveDayDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={fetchActiveDay}
      />
    </div>
  )
}