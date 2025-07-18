'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus } from 'lucide-react'
import { CreateHabitDialog } from './CreateHabitDialog'
import { ActiveHabitsList } from './ActiveHabitsList'
import { HabitHistoryList } from './HabitHistoryList'
import { Database } from '@/lib/supabase/types'

type ContinuousHabit = Database['public']['Tables']['ContinuousHabit']['Row']
type HabitRecord = Database['public']['Tables']['HabitRecord']['Row']
type HabitHistory = Database['public']['Tables']['HabitHistory']['Row']

type HabitWithRecords = ContinuousHabit & {
  records: HabitRecord[]
}

export function HabitTracker() {
  const [activeHabits, setActiveHabits] = useState<HabitWithRecords[]>([])
  const [habitHistory, setHabitHistory] = useState<HabitHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('active')
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [habitsData, historyData] = await Promise.all([
      supabase
        .from('ContinuousHabit')
        .select(`
          *,
          records:HabitRecord(*)
        `)
        .eq('userId', user.id)
        .eq('isActive', true)
        .order('createdAt', { ascending: false }),
      supabase
        .from('HabitHistory')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false })
    ])

    if (habitsData.data) {
      setActiveHabits(habitsData.data as HabitWithRecords[])
    }
    if (historyData.data) {
      setHabitHistory(historyData.data)
    }
    setLoading(false)
  }

  const recordHabitCompletion = async (habitId: string, date: Date, completed: boolean) => {
    const dateString = date.toISOString().split('T')[0]
    
    const { data: existing } = await supabase
      .from('HabitRecord')
      .select('*')
      .eq('habitId', habitId)
      .eq('date', dateString)
      .single()

    if (existing) {
      await supabase
        .from('HabitRecord')
        .update({ completed })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('HabitRecord')
        .insert({
          id: crypto.randomUUID(),
          habitId,
          date: dateString,
          completed,
        })
    }

    fetchData()
  }

  const completeHabit = async (habitId: string, status: 'completed' | 'failed' | 'abandoned') => {
    const habit = activeHabits.find(h => h.id === habitId)
    if (!habit) return

    const completedDays = habit.records.filter(r => r.completed).length
    
    await supabase
      .from('HabitHistory')
      .insert({
        id: crypto.randomUUID(),
        title: habit.title,
        category: habit.category,
        startDate: habit.startDate,
        endDate: new Date().toISOString(),
        totalDays: habit.targetDays,
        completedDays,
        status,
        userId: habit.userId,
      })

    await supabase
      .from('ContinuousHabit')
      .update({ isActive: false })
      .eq('id', habitId)

    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">習慣管理</h2>
          <p className="text-muted-foreground">
            {activeHabits.length} 個のアクティブな習慣
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新しい習慣
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            アクティブな習慣 ({activeHabits.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            履歴 ({habitHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <ActiveHabitsList
            habits={activeHabits}
            onRecordCompletion={recordHabitCompletion}
            onCompleteHabit={completeHabit}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="history">
          <HabitHistoryList
            history={habitHistory}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      <CreateHabitDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={fetchData}
      />
    </div>
  )
}