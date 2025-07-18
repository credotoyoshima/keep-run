'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Star, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Database } from '@/lib/supabase/types'

type DailyEvaluation = Database['public']['Tables']['DailyEvaluation']['Row']

interface EvaluationHistoryProps {
  evaluations: DailyEvaluation[]
  loading: boolean
}

export function EvaluationHistory({ evaluations, loading }: EvaluationHistoryProps) {
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const getRatingText = (rating: number) => {
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
      case 1: return 'text-red-600'
      case 2: return 'text-orange-600'
      case 3: return 'text-yellow-600'
      case 4: return 'text-blue-600'
      case 5: return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>評価履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>評価履歴</CardTitle>
        <CardDescription>
          過去の評価を確認できます
        </CardDescription>
      </CardHeader>
      <CardContent>
        {evaluations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            評価履歴がありません
          </div>
        ) : (
          <div className="space-y-4">
            {evaluations.slice(0, 10).map((evaluation) => (
              <div key={evaluation.id} className="border-b last:border-b-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">
                    {format(new Date(evaluation.date), 'M月d日（E）', { locale: ja })}
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStars(evaluation.rating)}
                    <span className={`text-sm font-medium ${getRatingColor(evaluation.rating)}`}>
                      {getRatingText(evaluation.rating)}
                    </span>
                  </div>
                </div>
                {evaluation.comment && (
                  <div className="flex items-start gap-2 mt-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-muted-foreground">
                      {evaluation.comment}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {evaluations.length > 10 && (
              <div className="text-center text-sm text-muted-foreground">
                他 {evaluations.length - 10} 件の評価
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}