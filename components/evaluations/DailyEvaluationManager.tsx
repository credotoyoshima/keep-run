'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Star, TrendingUp, Calendar as CalendarIcon } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import { TodayEvaluationCard } from './TodayEvaluationCard'
import { EvaluationHistory } from './EvaluationHistory'
import { EvaluationStats } from './EvaluationStats'
import { Database } from '@/lib/supabase/types'

type DailyEvaluation = Database['public']['Tables']['DailyEvaluation']['Row']

export function DailyEvaluationManager() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [evaluations, setEvaluations] = useState<DailyEvaluation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchEvaluations()
  }, [selectedDate])

  const fetchEvaluations = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const startDate = startOfMonth(selectedDate).toISOString().split('T')[0]
    const endDate = endOfMonth(selectedDate).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('DailyEvaluation')
      .select('*')
      .eq('userId', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (!error && data) {
      setEvaluations(data)
    }
    setLoading(false)
  }

  const saveEvaluation = async (date: Date, rating: number, comment: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const dateString = date.toISOString().split('T')[0]
    
    const { data: existing } = await supabase
      .from('DailyEvaluation')
      .select('*')
      .eq('userId', user.id)
      .eq('date', dateString)
      .single()

    if (existing) {
      await supabase
        .from('DailyEvaluation')
        .update({
          rating,
          comment: comment || null,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('DailyEvaluation')
        .insert({
          id: crypto.randomUUID(),
          date: dateString,
          rating,
          comment: comment || null,
          userId: user.id,
          updatedAt: new Date().toISOString(),
        })
    }

    fetchEvaluations()
  }

  const getEvaluationForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    return evaluations.find(evaluation => evaluation.date === dateString)
  }

  const getEvaluatedDates = () => {
    return evaluations.map(evaluation => new Date(evaluation.date))
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <TodayEvaluationCard
            evaluation={getEvaluationForDate(new Date())}
            onSave={(rating, comment) => saveEvaluation(new Date(), rating, comment)}
          />
          
          <EvaluationHistory
            evaluations={evaluations}
            loading={loading}
          />
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                カレンダー
              </CardTitle>
              <CardDescription>
                {format(selectedDate, 'yyyy年M月', { locale: ja })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
                modifiers={{
                  evaluated: getEvaluatedDates(),
                }}
                modifiersClassNames={{
                  evaluated: 'bg-blue-100 text-blue-900 font-semibold',
                }}
              />
              <div className="mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-100 rounded"></div>
                  評価済みの日
                </div>
              </div>
            </CardContent>
          </Card>

          <EvaluationStats evaluations={evaluations} />
        </div>
      </div>
    </div>
  )
}