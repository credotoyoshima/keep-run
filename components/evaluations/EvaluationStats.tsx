'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, BarChart3 } from 'lucide-react'
import { Database } from '@/lib/supabase/types'

type DailyEvaluation = Database['public']['Tables']['DailyEvaluation']['Row']

interface EvaluationStatsProps {
  evaluations: DailyEvaluation[]
}

export function EvaluationStats({ evaluations }: EvaluationStatsProps) {
  const calculateAverageRating = () => {
    if (evaluations.length === 0) return 0
    const sum = evaluations.reduce((acc, evaluation) => acc + evaluation.rating, 0)
    return sum / evaluations.length
  }

  const getRatingDistribution = () => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    evaluations.forEach(evaluation => {
      distribution[evaluation.rating as keyof typeof distribution]++
    })
    return distribution
  }

  const getTrend = () => {
    if (evaluations.length < 2) return 0
    
    const recent = evaluations.slice(0, 7) // 最近7日
    const older = evaluations.slice(7, 14) // その前の7日
    
    if (older.length === 0) return 0
    
    const recentAvg = recent.reduce((acc, evaluation) => acc + evaluation.rating, 0) / recent.length
    const olderAvg = older.reduce((acc, evaluation) => acc + evaluation.rating, 0) / older.length
    
    return recentAvg - olderAvg
  }

  const averageRating = calculateAverageRating()
  const distribution = getRatingDistribution()
  const trend = getTrend()
  const totalEvaluations = evaluations.length

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1: return '悪い'
      case 2: return 'いまいち'
      case 3: return '普通'
      case 4: return '良い'
      case 5: return 'とても良い'
      default: return ''
    }
  }

  const getRatingColor = (rating: number) => {
    switch (rating) {
      case 1: return 'bg-red-500'
      case 2: return 'bg-orange-500'
      case 3: return 'bg-yellow-500'
      case 4: return 'bg-blue-500'
      case 5: return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          統計情報
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-3xl font-bold">
            {averageRating.toFixed(1)}
          </div>
          <div className="text-sm text-muted-foreground">
            平均評価（{totalEvaluations} 日間）
          </div>
        </div>

        {trend !== 0 && (
          <div className={`flex items-center gap-2 text-sm ${
            trend > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`h-4 w-4 ${trend < 0 ? 'rotate-180' : ''}`} />
            {trend > 0 ? '改善傾向' : '悪化傾向'}
            <span className="text-muted-foreground">
              ({Math.abs(trend).toFixed(1)} ポイント)
            </span>
          </div>
        )}

        <div className="space-y-3">
          <div className="text-sm font-medium">評価分布</div>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = distribution[rating as keyof typeof distribution]
            const percentage = totalEvaluations > 0 ? (count / totalEvaluations) * 100 : 0
            
            return (
              <div key={rating} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{rating}★ {getRatingLabel(rating)}</span>
                  <span>{count} 日 ({percentage.toFixed(0)}%)</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getRatingColor(rating)}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}