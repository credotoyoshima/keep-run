'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Archive, Trash2, Calendar } from 'lucide-react'
import { format, isToday, isPast } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Database } from '@/lib/supabase/types'

type Todo = Database['public']['Tables']['Todo']['Row']

interface TodoListProps {
  todos: Todo[]
  onToggle: (todoId: string, completed: boolean) => void
  onArchive: (todoId: string) => void
  onDelete: (todoId: string) => void
  loading: boolean
  showArchived?: boolean
}

export function TodoList({ 
  todos, 
  onToggle, 
  onArchive, 
  onDelete, 
  loading,
  showArchived = false 
}: TodoListProps) {
  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }

  const getPriorityText = (priority: string | null) => {
    switch (priority) {
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
      default: return ''
    }
  }

  const getDueDateInfo = (dueDate: string | null) => {
    if (!dueDate) return null
    
    const date = new Date(dueDate)
    const isOverdue = isPast(date) && !isToday(date)
    const isDueToday = isToday(date)
    
    return {
      date,
      isOverdue,
      isDueToday,
      formatted: format(date, 'M/d', { locale: ja })
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (todos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          {showArchived ? 'アーカイブされたTODOはありません' : 'TODOがありません'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {todos.map((todo) => {
        const dueDateInfo = getDueDateInfo(todo.dueDate)
        
        return (
          <Card key={todo.id} className={todo.completed ? 'opacity-75' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => onToggle(todo.id, todo.completed)}
                  className="mt-1"
                  disabled={todo.archived}
                />
                
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {todo.title}
                  </div>
                  
                  {todo.description && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {todo.description}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2">
                    {todo.priority && (
                      <Badge variant={getPriorityColor(todo.priority)} className="text-xs">
                        {getPriorityText(todo.priority)}
                      </Badge>
                    )}
                    
                    {dueDateInfo && (
                      <Badge 
                        variant={dueDateInfo.isOverdue ? 'destructive' : dueDateInfo.isDueToday ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        <Calendar className="mr-1 h-3 w-3" />
                        {dueDateInfo.formatted}
                        {dueDateInfo.isDueToday && ' (今日)'}
                        {dueDateInfo.isOverdue && ' (期限切れ)'}
                      </Badge>
                    )}
                    
                    {todo.archived && (
                      <Badge variant="secondary" className="text-xs">
                        アーカイブ済み
                      </Badge>
                    )}
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!todo.archived && (
                      <DropdownMenuItem onClick={() => onArchive(todo.id)}>
                        <Archive className="mr-2 h-4 w-4" />
                        アーカイブ
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => onDelete(todo.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      削除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}