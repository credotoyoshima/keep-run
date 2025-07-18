'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Clock, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Database } from '@/lib/supabase/types'

type ActiveTimeBlock = Database['public']['Tables']['ActiveTimeBlock']['Row']
type ActiveTask = Database['public']['Tables']['ActiveTask']['Row']

type ActiveTimeBlockWithTasks = ActiveTimeBlock & {
  tasks: ActiveTask[]
}

interface ActiveTimeBlockCardProps {
  block: ActiveTimeBlockWithTasks
  onTaskToggle: (taskId: string, completed: boolean) => void
}

export function ActiveTimeBlockCard({ block, onTaskToggle }: ActiveTimeBlockCardProps) {
  const [expanded, setExpanded] = useState(true)

  const completedTasks = block.tasks.filter(task => task.completed).length
  const totalTasks = block.tasks.length
  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">{block.title}</CardTitle>
              <div className="text-sm text-muted-foreground">
                {block.startTime} • {completedTasks}/{totalTasks} タスク完了
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-lg font-bold">
                {Math.round(completionPercentage)}%
              </div>
              <div className="text-xs text-muted-foreground">完了</div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setExpanded(!expanded)}>
                  {expanded ? '折りたたむ' : '展開する'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Progress value={completionPercentage} className="h-2" />
      </CardHeader>
      
      {expanded && (
        <CardContent>
          {block.tasks.length > 0 ? (
            <div className="space-y-3">
              {block.tasks
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((task) => (
                  <div key={task.id} className="flex items-center gap-3 group">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => onTaskToggle(task.id, task.completed)}
                    />
                    <div className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </div>
                    {task.completed && (
                      <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        完了
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              このブロックにはタスクがありません
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}