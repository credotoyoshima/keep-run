'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star } from 'lucide-react'
import { Database } from '@/lib/supabase/types'

type DailyEvaluation = Database['public']['Tables']['DailyEvaluation']['Row']

interface TodayEvaluationCardProps {
  evaluation: DailyEvaluation | undefined
  onSave: (rating: number, comment: string) => void
}

export function TodayEvaluationCard({ evaluation, onSave }: TodayEvaluationCardProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [hoveredRating, setHoveredRating] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (evaluation) {
      setRating(evaluation.rating)
      setComment(evaluation.comment || '')
    }
  }, [evaluation])

  const handleSave = async () => {
    if (rating === 0) return
    
    setLoading(true)
    await onSave(rating, comment)
    setLoading(false)
  }

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return '悪い'
      case 2: return 'いまいち'
      case 3: return '普通'
      case 4: return '良い'
      case 5: return 'とても良い'
      default: return '評価してください'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          今日の評価
        </CardTitle>
        <CardDescription>
          {new Date().toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="text-sm font-medium mb-2">
            今日一日はどうでしたか？
          </div>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-colors"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            {getRatingText(hoveredRating || rating)}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium mb-2">
            振り返りコメント（任意）
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="今日の良かった点や改善点を書いてみましょう..."
            rows={4}
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={rating === 0 || loading}
          className="w-full"
        >
          {loading ? '保存中...' : evaluation ? '更新' : '保存'}
        </Button>
      </CardContent>
    </Card>
  )
}