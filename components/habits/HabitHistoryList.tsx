'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, XCircle, Archive, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Database } from '@/lib/supabase/types'

type HabitHistory = Database['public']['Tables']['HabitHistory']['Row']

interface HabitHistoryListProps {
  history: HabitHistory[]
  loading: boolean
}

export function HabitHistoryList({ history, loading }: HabitHistoryListProps) {
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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          label: '目標達成',
          variant: 'default' as const,
          color: 'text-green-600'
        }
      case 'failed':
        return {
          icon: XCircle,
          label: '失敗',
          variant: 'destructive' as const,
          color: 'text-red-600'
        }
      case 'abandoned':
        return {
          icon: Archive,
          label: '中断',
          variant: 'secondary' as const,
          color: 'text-gray-600'
        }
      default:
        return {
          icon: Calendar,
          label: '不明',
          variant: 'outline' as const,
          color: 'text-gray-600'
        }
    }
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

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          習慣の履歴がありません
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {history.map((item) => {
        const statusInfo = getStatusInfo(item.status)
        const successRate = item.totalDays > 0 ? (item.completedDays / item.totalDays) * 100 : 0
        const StatusIcon = statusInfo.icon

        return (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getCategoryIcon(item.category)}</span>
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>
                      <Badge variant="outline" className="mr-2">
                        {getCategoryLabel(item.category)}
                      </Badge>
                      {format(new Date(item.startDate), 'PPP', { locale: ja })} 〜 {' '}
                      {format(new Date(item.endDate), 'PPP', { locale: ja })}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={statusInfo.variant} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {statusInfo.label}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">達成率</span>
                  <span className="text-sm text-muted-foreground">
                    {item.completedDays}/{item.totalDays} 日 ({Math.round(successRate)}%)
                  </span>
                </div>
                <Progress value={successRate} className="h-2" />
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {item.completedDays}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    達成日数
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {item.totalDays}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    目標日数
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(successRate)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    成功率
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}