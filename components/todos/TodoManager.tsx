'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search } from 'lucide-react'
import { CreateTodoDialog } from './CreateTodoDialog'
import { TodoList } from './TodoList'
import { Database } from '@/lib/supabase/types'

type Todo = Database['public']['Tables']['Todo']['Row']

export function TodoManager() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('active')
  const supabase = createClient()

  useEffect(() => {
    fetchTodos()
  }, [])

  const fetchTodos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('Todo')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })

    if (!error && data) {
      setTodos(data)
    }
    setLoading(false)
  }

  const toggleTodo = async (todoId: string, completed: boolean) => {
    const { error } = await supabase
      .from('Todo')
      .update({ 
        completed: !completed,
        updatedAt: new Date().toISOString()
      })
      .eq('id', todoId)

    if (!error) {
      setTodos(todos.map(todo => 
        todo.id === todoId 
          ? { ...todo, completed: !completed }
          : todo
      ))
    }
  }

  const archiveTodo = async (todoId: string) => {
    const { error } = await supabase
      .from('Todo')
      .update({ 
        archived: true,
        updatedAt: new Date().toISOString()
      })
      .eq('id', todoId)

    if (!error) {
      setTodos(todos.map(todo => 
        todo.id === todoId 
          ? { ...todo, archived: true }
          : todo
      ))
    }
  }

  const deleteTodo = async (todoId: string) => {
    const { error } = await supabase
      .from('Todo')
      .delete()
      .eq('id', todoId)

    if (!error) {
      setTodos(todos.filter(todo => todo.id !== todoId))
    }
  }

  const filteredTodos = todos.filter(todo => {
    const matchesSearch = todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (todo.description && todo.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    switch (activeTab) {
      case 'active':
        return !todo.completed && !todo.archived && matchesSearch
      case 'completed':
        return todo.completed && !todo.archived && matchesSearch
      case 'archived':
        return todo.archived && matchesSearch
      default:
        return matchesSearch
    }
  })

  const activeTodos = todos.filter(t => !t.completed && !t.archived)
  const completedTodos = todos.filter(t => t.completed && !t.archived)
  const archivedTodos = todos.filter(t => t.archived)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="TODOを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新しいTODO
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">
            アクティブ ({activeTodos.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            完了済み ({completedTodos.length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            アーカイブ ({archivedTodos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <TodoList
            todos={filteredTodos}
            onToggle={toggleTodo}
            onArchive={archiveTodo}
            onDelete={deleteTodo}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="completed">
          <TodoList
            todos={filteredTodos}
            onToggle={toggleTodo}
            onArchive={archiveTodo}
            onDelete={deleteTodo}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="archived">
          <TodoList
            todos={filteredTodos}
            onToggle={toggleTodo}
            onArchive={archiveTodo}
            onDelete={deleteTodo}
            loading={loading}
            showArchived
          />
        </TabsContent>
      </Tabs>

      <CreateTodoDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={fetchTodos}
      />
    </div>
  )
}