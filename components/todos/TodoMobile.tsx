'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { LoadingSpinnerCenter } from '@/components/ui/LoadingSpinner'
import { 
  Check, 
  Plus, 
  Circle,
  Edit2,
  Trash2,
  Star
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useDayChangeDetection } from '@/lib/day-change-detector'
import { useDayStartTimeGlobal } from '@/lib/hooks/useDayStartTimeGlobal'

interface Todo {
  id: string
  title: string
  description?: string | null
  completed: boolean
  taskType: 'routine' | 'spot'
  important: boolean
  dueDate?: string | null
  createdAt: string
  updatedAt: string
}



export function TodoMobile() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [newTodoType, setNewTodoType] = useState<'routine' | 'spot'>('spot')
  const [newTodoImportant, setNewTodoImportant] = useState(false)
  const [swipedTodo, setSwipedTodo] = useState<string | null>(null)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [editingTodo, setEditingTodo] = useState<string | null>(null)
  const [editTodoTitle, setEditTodoTitle] = useState('')
  const [editTodoType, setEditTodoType] = useState<'routine' | 'spot'>('spot')
  const [editTodoImportant, setEditTodoImportant] = useState(false)

  // ToDoリストを取得
  const fetchTodos = async () => {
    try {
      const response = await fetch('/api/todos')
      if (!response.ok) {
        console.error('Failed to fetch todos')
        return
      }
      const data = await response.json()
      setTodos(data)
    } catch (error) {
      console.error('Error fetching todos:', error)
    } finally {
      setLoading(false)
    }
  }

  // useDayStartTimeGlobalフックを使用
  const { dayStartTime } = useDayStartTimeGlobal()

  // 日付変更を検出してToDoリストを更新
  useDayChangeDetection(dayStartTime, () => {
    console.log('Day changed, refreshing todos...')
    fetchTodos()
  })

  useEffect(() => {
    fetchTodos()

    // 設定変更時にToDoリストを再取得
    const handleSettingsChange = () => {
      fetchTodos()
    }

    window.addEventListener('settingsChanged', handleSettingsChange)
    return () => {
      window.removeEventListener('settingsChanged', handleSettingsChange)
    }
  }, [])

  // メニューの外側をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // 編集・削除ボタンのクリックは無視
      if (target.closest('.swipe-action-button')) {
        return
      }
      
      // 新規追加フォームが表示されている場合、フォーム外をクリックしたらキャンセル
      if (showAddForm) {
        const isAddForm = target.closest('.add-form')
        if (!isAddForm) {
          setShowAddForm(false)
          setNewTodoTitle('')
          setNewTodoType('spot')
        }
      }
      
      // 編集フォームが表示されている場合、フォーム外をクリックしたらキャンセル
      if (editingTodo) {
        const isEditForm = target.closest('.edit-form')
        if (!isEditForm) {
          setEditingTodo(null)
          setEditTodoTitle('')
          setEditTodoType('spot')
          setEditTodoImportant(false)
        }
      }
      
      // スワイプされた状態をリセット
      setSwipedTodo(null)
    }
    // mousedownイベントを使用（clickイベントより早く発火）
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAddForm, newTodoTitle, editingTodo, editTodoTitle])

  // スワイプ処理
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX)
  }

  const handleTouchEnd = (todoId: string) => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    
    if (isLeftSwipe) {
      setSwipedTodo(todoId)
    } else {
      setSwipedTodo(null)
    }
    
    setTouchStart(0)
    setTouchEnd(0)
  }

  // ToDoの完了状態を切り替え
  const toggleTodoCompletion = async (todoId: string) => {
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return

    // 楽観的更新
    setTodos(todos =>
      todos.map(t =>
        t.id === todoId ? { ...t, completed: !t.completed } : t
      )
    )

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completed: !todo.completed })
      })

      if (!response.ok) {
        // エラーの場合は元に戻す
        setTodos(todos =>
          todos.map(t =>
            t.id === todoId ? { ...t, completed: todo.completed } : t
          )
        )
      } else {
        // ルーティンタスクの場合、サーバーからの応答で更新
        const updatedTodo = await response.json()
        setTodos(todos =>
          todos.map(t =>
            t.id === todoId ? { ...t, completed: updatedTodo.completed } : t
          )
        )
      }
    } catch (error) {
      console.error('Error updating todo:', error)
      // エラーの場合は元に戻す
      setTodos(todos =>
        todos.map(t =>
          t.id === todoId ? { ...t, completed: todo.completed } : t
        )
      )
    }
  }

  // 重要フラグを切り替え
  const toggleTodoImportant = async (todoId: string) => {
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return

    // 楽観的更新
    setTodos(todos =>
      todos.map(t =>
        t.id === todoId ? { ...t, important: !t.important } : t
      )
    )

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ important: !todo.important })
      })

      if (!response.ok) {
        // エラーの場合は元に戻す
        setTodos(todos =>
          todos.map(t =>
            t.id === todoId ? { ...t, important: todo.important } : t
          )
        )
      }
    } catch (error) {
      console.error('Error updating todo:', error)
      // エラーの場合は元に戻す
      setTodos(todos =>
        todos.map(t =>
          t.id === todoId ? { ...t, important: todo.important } : t
        )
      )
    }
  }

  // 新しいToDoを追加
  const addTodo = async () => {
    if (!newTodoTitle.trim()) return

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: newTodoTitle,
          taskType: newTodoType,
          important: newTodoImportant
        })
      })

      if (response.ok) {
        await fetchTodos()
        setNewTodoTitle('')
        setNewTodoType('spot')
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Error adding todo:', error)
    }
  }

  // ToDoを削除
  const deleteTodo = async (todoId: string) => {
    if (!confirm('このToDoを削除してもよろしいですか？')) return

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchTodos()
        setSwipedTodo(null)
      }
    } catch (error) {
      console.error('Error deleting todo:', error)
    }
  }

  // 編集を開始
  const startEditingTodo = (todo: Todo) => {
    setEditingTodo(todo.id)
    setEditTodoTitle(todo.title)
    setEditTodoType(todo.taskType)
    setEditTodoImportant(todo.important)
    setSwipedTodo(null)
  }

  // ToDoを更新
  const updateTodo = async (todoId: string) => {
    if (!editTodoTitle.trim()) return

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          title: editTodoTitle,
          taskType: editTodoType,
          important: editTodoImportant
        })
      })

      if (response.ok) {
        await fetchTodos()
        setEditingTodo(null)
        setEditTodoTitle('')
        setEditTodoType('spot')
        setEditTodoImportant(false)
      }
    } catch (error) {
      console.error('Error updating todo:', error)
    }
  }

  const filteredTodos = todos.filter(todo => {
    if (filter === 'pending') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  const completedCount = todos.filter(todo => todo.completed).length
  const totalCount = todos.length
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (loading) {
    return (
      <MobileLayout title="ToDo">
        <LoadingSpinnerCenter size="lg" />
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="ToDo">
      <div className="p-5 pb-0">
      {/* Progress Summary */}
      <div className="bg-black text-white rounded-lg p-4 mb-5 relative">
        <div className="text-3xl font-extralight mb-1 tracking-tight text-center">
          {progressPercentage}%
        </div>
        <div className="text-xs opacity-80 font-light mb-2 text-right">
          {completedCount} / {totalCount} タスク完了
        </div>
        <div className="h-0.5 bg-white/20 overflow-hidden">
          <div 
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-5">
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            filter === 'pending' 
              ? 'bg-white text-black shadow-sm' 
              : 'text-gray-600 hover:text-black'
          }`}
          onClick={() => setFilter('pending')}
        >
          未完了 ({totalCount - completedCount})
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            filter === 'completed' 
              ? 'bg-white text-black shadow-sm' 
              : 'text-gray-600 hover:text-black'
          }`}
          onClick={() => setFilter('completed')}
        >
          完了 ({completedCount})
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            filter === 'all' 
              ? 'bg-white text-black shadow-sm' 
              : 'text-gray-600 hover:text-black'
          }`}
          onClick={() => setFilter('all')}
        >
          すべて ({totalCount})
        </button>
      </div>

      {/* Todo List */}
      <div className="space-y-3 mb-5">
        {filteredTodos.map((todo) => (
          <div 
            key={todo.id}
            className={`bg-white rounded-lg overflow-hidden transition-all ${
              todo.completed ? 'opacity-60' : ''
            } ${
              todo.important 
                ? 'border-l-4 border-l-red-500 bg-red-50 border border-red-200' 
                : 'border-l-4 border-l-gray-300 border border-gray-200'
            }`}
          >
            <div className="relative">
              {/* 編集フォーム */}
              {editingTodo === todo.id ? (
                <div className="p-3 edit-form space-y-2">
                  <Input
                    value={editTodoTitle}
                    onChange={(e) => setEditTodoTitle(e.target.value)}
                    className="w-full"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setEditingTodo(null)
                        setEditTodoTitle('')
                        setEditTodoType('spot')
                        setEditTodoImportant(false)
                      } else if (e.key === 'Enter' && editTodoTitle.trim()) {
                        updateTodo(todo.id)
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="spot"
                          checked={editTodoType === 'spot'}
                          onChange={(e) => setEditTodoType(e.target.value as 'routine' | 'spot')}
                          className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                        />
                        <span className="text-sm font-medium text-gray-700">スポット</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="routine"
                          checked={editTodoType === 'routine'}
                          onChange={(e) => setEditTodoType(e.target.value as 'routine' | 'spot')}
                          className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                        />
                        <span className="text-sm font-medium text-gray-700">ルーティン</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer ml-4">
                        <input
                          type="checkbox"
                          checked={editTodoImportant}
                          onChange={(e) => setEditTodoImportant(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm font-medium text-gray-700">重要</span>
                      </label>
                    </div>
                    <Button
                      onClick={() => updateTodo(todo.id)}
                      disabled={!editTodoTitle.trim()}
                      size="icon"
                      className="h-9 w-9 bg-black hover:bg-gray-800 ml-auto"
                    >
                      <Check className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* メインコンテンツ */}
                  <div
                    className={`p-3 flex items-start gap-3 bg-white transition-transform duration-200 ease-out relative z-10 ${
                      swipedTodo === todo.id ? '-translate-x-24' : 'translate-x-0'
                    }`}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={() => handleTouchEnd(todo.id)}
                    onTouchCancel={() => {
                      setTouchStart(0)
                      setTouchEnd(0)
                    }}
                  >
                    <button
                      className={`w-[20px] h-[20px] border-2 rounded-full flex items-center justify-center transition-all mt-0.5 ${
                        todo.completed 
                          ? 'bg-black border-black' 
                          : 'border-gray-300 hover:border-gray-600'
                      }`}
                      onClick={() => toggleTodoCompletion(todo.id)}
                    >
                      {todo.completed && (
                        <Check className="h-3 w-3 text-white stroke-2" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span 
                          className={`text-[15px] font-normal leading-tight ${
                            todo.completed 
                              ? 'line-through text-gray-500' 
                              : 'text-black'
                          }`}
                        >
                          {todo.title}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {todo.important && (
                            <div className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 border border-red-200">
                              重要
                            </div>
                          )}
                          <div className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                            todo.taskType === 'routine' 
                              ? 'bg-blue-100 text-blue-700 border-blue-200' 
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            {todo.taskType === 'routine' ? 'ルーティン' : 'スポット'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* スワイプアクションボタン */}
                  <div
                    className={`absolute right-0 top-0 h-full flex items-center gap-2 px-3 transition-all duration-200 ${
                      swipedTodo === todo.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleTodoImportant(todo.id)
                        setSwipedTodo(null)
                      }}
                      className={`swipe-action-button p-2 hover:bg-yellow-50 rounded-lg transition-colors bg-white shadow-sm border border-gray-200 ${
                        todo.important ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <Star className={`h-4 w-4 ${
                        todo.important ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'
                      }`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        startEditingTodo(todo)
                      }}
                      className="swipe-action-button p-2 hover:bg-gray-100 rounded-lg transition-colors bg-white shadow-sm border border-gray-200"
                    >
                      <Edit2 className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteTodo(todo.id)
                      }}
                      className="swipe-action-button p-2 hover:bg-red-50 rounded-lg transition-colors bg-white shadow-sm border border-gray-200"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {filteredTodos.length === 0 && (
          <div className="text-center pt-8 pb-2">
            <Circle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <div className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'completed' ? '完了したTodoがありません' : 'Todoがありません'}
            </div>
                         <div className="text-gray-500 font-light">
               {filter === 'completed' 
                 ? 'Todoを完了してここに表示させましょう' 
                 : '新しく追加して始めましょう'
               }
            </div>
          </div>
        )}
      </div>

      {/* Add Todo */}
      {showAddForm ? (
        <div 
          className="bg-white border border-gray-200 rounded-lg p-4 mb-20 add-form"
          onClick={(e) => {
            // クリックターゲットがフォーム自体の場合はキャンセル
            if (e.target === e.currentTarget) {
              setShowAddForm(false)
              setNewTodoTitle('')
            }
          }}
        >
          <div className="space-y-2">
            <Input
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              placeholder="ToDoを入力"
              className="w-full"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowAddForm(false)
                  setNewTodoTitle('')
                  setNewTodoType('spot')
                } else if (e.key === 'Enter' && newTodoTitle.trim()) {
                  addTodo()
                }
              }}
            />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="spot"
                    checked={newTodoType === 'spot'}
                    onChange={(e) => setNewTodoType(e.target.value as 'routine' | 'spot')}
                    className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                  />
                  <span className="text-sm font-medium text-gray-700">スポット</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="routine"
                    checked={newTodoType === 'routine'}
                    onChange={(e) => setNewTodoType(e.target.value as 'routine' | 'spot')}
                    className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                  />
                  <span className="text-sm font-medium text-gray-700">ルーティン</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={newTodoImportant}
                    onChange={(e) => setNewTodoImportant(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700">重要</span>
                </label>
              </div>
              <Button
                onClick={addTodo}
                disabled={!newTodoTitle.trim()}
                size="icon"
                className="h-9 w-9 bg-black hover:bg-gray-800 ml-auto"
              >
                <Check className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button 
          className="w-full border border-dashed border-gray-400 rounded-lg p-5 flex items-center justify-center gap-2 text-gray-700 hover:border-black hover:text-black transition-all font-light mb-20"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-4 w-4" />
          <span className="text-[15px]">新しいToDoを追加</span>
        </button>
      )}

    </div>
    </MobileLayout>
  )
}