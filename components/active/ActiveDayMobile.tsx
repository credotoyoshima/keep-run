'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { Input } from '@/components/ui/input'
import { TimePickerModal } from '@/components/ui/time-picker-modal'
import { LoadingSpinnerCenter } from '@/components/ui/LoadingSpinner'
import { 
  ChevronDown, 
  ChevronRight, 
  Check,
  Plus,
  Clock,
  X,
  MoreVertical,
  Edit2,
  Trash2
} from 'lucide-react'

interface Task {
  id: string
  title: string
  completed: boolean
  orderIndex: number
}

interface TimeBlock {
  id: string
  startTime: string
  title: string
  tasks: Task[]
  orderIndex: number
  completionRate: number
}

interface TimeBlocksData {
  id: string
  timeBlocks: TimeBlock[]
}

export function ActiveDayMobile() {
  const [activeDay, setActiveDay] = useState<TimeBlocksData | null>(null)
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [newBlockTitle, setNewBlockTitle] = useState('')
  const [newBlockTime, setNewBlockTime] = useState('00:00')
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [newTaskInputs, setNewTaskInputs] = useState<{ [blockId: string]: string }>({})
  const [showTaskInput, setShowTaskInput] = useState<{ [blockId: string]: boolean }>({})
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null)
  const [editBlockTitle, setEditBlockTitle] = useState('')
  const [editBlockTime, setEditBlockTime] = useState('')
  const [showEditTimePicker, setShowEditTimePicker] = useState(false)
  const [showBlockMenu, setShowBlockMenu] = useState<string | null>(null)
  const [showTaskMenu, setShowTaskMenu] = useState<string | null>(null)
  const [swipedBlock, setSwipedBlock] = useState<string | null>(null)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  // メニューの外側をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // スワイプされたブロックのボタンクリックは無視
      if (target.closest('.swipe-action-buttons')) {
        return
      }
      
      setShowBlockMenu(null)
      setShowTaskMenu(null)
      setSwipedBlock(null)
      
      // 編集中のブロックがある場合、編集フォーム外をクリックしたらキャンセル
      if (editingBlock) {
        const target = e.target as HTMLElement
        const isEditForm = target.closest('.edit-form')
        const isTimePicker = target.closest('[role="dialog"]')
        if (!isEditForm && !isTimePicker) {
          setEditingBlock(null)
          setEditBlockTitle('')
          setEditBlockTime('')
        }
      }
      
      // 新規追加フォームが表示されている場合、フォーム外をクリックしたらキャンセル
      if (showBlockForm) {
        const target = e.target as HTMLElement
        const isAddForm = target.closest('.add-form')
        const isTimePicker = target.closest('[role="dialog"]')
        if (!isAddForm && !isTimePicker) {
          setShowBlockForm(false)
          setNewBlockTitle('')
          setNewBlockTime('00:00')
        }
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showBlockMenu, showTaskMenu, swipedBlock, editingBlock, showBlockForm, editBlockTitle, editBlockTime, newBlockTitle, newBlockTime])


  const fetchActiveDay = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/day')
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to fetch data')
      }
      
      const data = await response.json()
      setActiveDay(data)
      
      // 初期状態で展開するブロックを設定（completionRate < 1のもの）
      if (data && data.timeBlocks) {
        const blocksToExpand = data.timeBlocks
          .filter((block: TimeBlock) => block.completionRate < 1)
          .map((block: TimeBlock) => block.id)
        setExpandedBlocks(new Set(blocksToExpand))
      }
    } catch (error) {
      console.error('Error fetching active day:', error)
      // エラー時は空のデータで初期化
      setActiveDay(null)
    } finally {
      setLoading(false)
    }
  }

  // APIからデータを取得
  useEffect(() => {
    fetchActiveDay()
  }, [])

  // 時間ブロックを追加
  const addTimeBlock = async () => {
    if (!newBlockTitle || !newBlockTime || !activeDay) return

    try {
      const response = await fetch('/api/day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'addTimeBlock',
          dayId: activeDay.id,
          data: {
            title: newBlockTitle,
            startTime: newBlockTime
          }
        })
      })

      if (!response.ok) throw new Error('Failed to add time block')
      
      // データを再取得
      await fetchActiveDay()
      setNewBlockTitle('')
      setNewBlockTime('00:00')
      setShowBlockForm(false)
    } catch (error) {
      console.error('Error adding time block:', error)
    }
  }

  // タスクを追加
  const addTask = async (blockId: string) => {
    const taskTitle = newTaskInputs[blockId]
    if (!taskTitle) return

    try {
      const response = await fetch('/api/day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'addTask',
          blockId,
          data: {
            title: taskTitle
          }
        })
      })

      if (!response.ok) throw new Error('Failed to add task')
      
      // データを再取得
      await fetchActiveDay()
      setNewTaskInputs(prev => ({ ...prev, [blockId]: '' }))
      setShowTaskInput(prev => ({ ...prev, [blockId]: false }))
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  // タスクの完了状態をトグル
  const toggleTaskCompletion = async (blockId: string, taskId: string, currentCompleted: boolean) => {
    if (!activeDay) return

    // 楽観的更新: 即座にUIを更新
    const updatedActiveDay = {
      ...activeDay,
      timeBlocks: activeDay.timeBlocks.map(block => {
        if (block.id === blockId) {
          const updatedTasks = block.tasks.map(task => {
            if (task.id === taskId) {
              return { ...task, completed: !currentCompleted }
            }
            return task
          })
          
          // 完了率を計算
          const completedCount = updatedTasks.filter(task => task.completed).length
          const completionRate = updatedTasks.length > 0 ? completedCount / updatedTasks.length : 0
          
          return {
            ...block,
            tasks: updatedTasks,
            completionRate
          }
        }
        return block
      })
    }
    setActiveDay(updatedActiveDay)

    // バックグラウンドでAPIを呼び出し
    try {
      const response = await fetch('/api/day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'toggleTask',
          blockId,
          data: {
            taskId,
            completed: !currentCompleted
          }
        })
      })

      if (!response.ok) {
        // エラーの場合は元に戻す
        setActiveDay(activeDay)
        throw new Error('Failed to toggle task')
      }
    } catch (error) {
      console.error('Error toggling task:', error)
      // エラーの場合は元に戻す
      setActiveDay(activeDay)
    }
  }

  const toggleBlockExpansion = (blockId: string) => {
    setExpandedBlocks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(blockId)) {
        newSet.delete(blockId)
      } else {
        newSet.add(blockId)
      }
      return newSet
    })
  }

  // 時間ブロックを更新
  const updateTimeBlock = async () => {
    if (!editingBlock || !activeDay) return

    try {
      const response = await fetch('/api/day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'updateTimeBlock',
          blockId: editingBlock.id,
          data: {
            title: editBlockTitle,
            startTime: editBlockTime
          }
        })
      })

      if (!response.ok) throw new Error('Failed to update time block')
      
      // データを再取得
      await fetchActiveDay()
      setEditingBlock(null)
      setEditBlockTitle('')
      setEditBlockTime('')
    } catch (error) {
      console.error('Error updating time block:', error)
    }
  }

  // 時間ブロックを削除
  const deleteTimeBlock = async (blockId: string) => {
    if (!activeDay || !confirm('この時間ブロックを削除してもよろしいですか？')) return

    try {
      const response = await fetch('/api/day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'deleteTimeBlock',
          blockId
        })
      })

      if (!response.ok) throw new Error('Failed to delete time block')
      
      // データを再取得
      await fetchActiveDay()
      setShowBlockMenu(null)
    } catch (error) {
      console.error('Error deleting time block:', error)
    }
  }

  // 編集開始
  const startEditingBlock = (block: TimeBlock) => {
    setEditingBlock(block)
    setEditBlockTitle(block.title)
    setEditBlockTime(block.startTime)
    setShowBlockMenu(null)
  }

  // タスクを削除
  const deleteTask = async (blockId: string, taskId: string) => {
    if (!activeDay) return

    try {
      const response = await fetch('/api/day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'deleteTask',
          blockId,
          data: { taskId }
        })
      })

      if (!response.ok) throw new Error('Failed to delete task')
      
      // データを再取得
      await fetchActiveDay()
      setShowTaskMenu(null)
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  // スワイプ処理（時間ブロック用）
  const handleBlockTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
    setTouchEnd(0)
  }

  const handleBlockTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX)
  }

  const handleBlockTouchEnd = (blockId: string) => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    
    if (isLeftSwipe) {
      setSwipedBlock(blockId)
    } else {
      setSwipedBlock(null)
    }
    
    setTouchStart(0)
    setTouchEnd(0)
  }

  if (loading) {
    return (
      <MobileLayout title="DAY">
        <LoadingSpinnerCenter size="lg" />
      </MobileLayout>
    )
  }

  if (!activeDay) {
    return (
      <MobileLayout title="DAY">
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-700">データが見つかりません</div>
        </div>
      </MobileLayout>
    )
  }

  const completedTasks = activeDay.timeBlocks.reduce((total, block) => 
    total + block.tasks.filter(task => task.completed).length, 0
  )
  
  const totalTasks = activeDay.timeBlocks.reduce((total, block) => 
    total + block.tasks.length, 0
  )
  
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <MobileLayout title="DAY">
      <div className="p-5">

      {/* Progress Summary */}
      <div className="bg-black text-white rounded-lg p-4 mb-5 relative">
        <div className="text-3xl font-extralight mb-1 tracking-tight text-center">
          {progressPercentage}%
        </div>
        <div className="text-xs opacity-80 font-light mb-2 text-right">
          {completedTasks} / {totalTasks} タスク完了
        </div>
        <div className="h-0.5 bg-white/20 overflow-hidden">
          <div 
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Time Blocks */}
      <div className="space-y-3 mb-5">
        {activeDay.timeBlocks.map((block) => {
          const blockCompletedTasks = block.tasks.filter(task => task.completed).length
          const isCompleted = block.completionRate === 1 && block.tasks.length > 0
          const isExpanded = expandedBlocks.has(block.id)

          return editingBlock?.id === block.id ? (
            // 編集フォーム
            <div 
              key={block.id} 
              className="bg-white border border-gray-200 rounded-lg p-4 mb-3 edit-form"
              onClick={(e) => {
                // クリックターゲットが編集フォーム内の要素でない場合はキャンセル
                if (e.target === e.currentTarget) {
                  setEditingBlock(null)
                  setEditBlockTitle('')
                  setEditBlockTime('')
                }
              }}
            >
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowEditTimePicker(true)}
                  className="flex items-center gap-2 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors hover:border-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm font-mono mr-2"
                >
                  <Clock className="h-4 w-4 text-gray-500" />
                  {editBlockTime}
                </button>
                <Input
                  value={editBlockTitle}
                  onChange={(e) => setEditBlockTitle(e.target.value)}
                  placeholder="時間ブロックのタイトル"
                  className="flex-1 mr-2"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setEditingBlock(null)
                      setEditBlockTitle('')
                      setEditBlockTime('')
                    } else if (e.key === 'Enter' && editBlockTitle && editBlockTime) {
                      updateTimeBlock()
                    }
                  }}
                />
                <Button
                  onClick={updateTimeBlock}
                  disabled={!editBlockTitle || !editBlockTime}
                  size="icon"
                  className="h-9 w-9 bg-black hover:bg-gray-800"
                >
                  <Check className="h-4 w-4 text-white" />
                </Button>
              </div>
            </div>
          ) : (
            // 通常表示
            <div
              key={block.id}
              className={`bg-white border rounded-lg overflow-hidden transition-all duration-200 ${
                isCompleted ? 'opacity-60' : ''
              } border-gray-200`}
            >
              <div className="relative overflow-hidden">
                <div
                  className={`p-3 flex items-center justify-between bg-white transition-transform duration-200 ease-out relative z-10 ${
                    swipedBlock === block.id ? '-translate-x-24' : 'translate-x-0'
                  }`}
                  onTouchStart={handleBlockTouchStart}
                  onTouchMove={handleBlockTouchMove}
                  onTouchEnd={() => handleBlockTouchEnd(block.id)}
                  onTouchCancel={() => {
                    setTouchStart(0)
                    setTouchEnd(0)
                  }}
                >
                  <div
                    className="flex-1 flex items-center cursor-pointer"
                    onClick={() => toggleBlockExpansion(block.id)}
                  >
                    <div className="text-sm font-semibold text-black min-w-[50px] font-mono">
                      {block.startTime}
                    </div>
                    <div className="flex-1 text-base font-normal mx-2">
                      {block.title}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-mono ${
                          isCompleted ? 'text-green-600' : 'text-gray-700'
                        }`}
                      >
                        {blockCompletedTasks}/{block.tasks.length}
                      </span>
                      <div className="w-5 h-5 flex items-center justify-center">
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 text-gray-700" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-gray-700" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={`absolute right-0 top-0 h-full flex items-center gap-2 px-3 transition-all duration-200 swipe-action-buttons ${
                    swipedBlock === block.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      startEditingBlock(block)
                      setSwipedBlock(null)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors bg-white shadow-sm border border-gray-200"
                  >
                    <Edit2 className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      deleteTimeBlock(block.id)
                      setSwipedBlock(null)
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors bg-white shadow-sm border border-gray-200"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="space-y-2">
                    {block.tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 py-2">
                        <button
                          className={`w-[18px] h-[18px] border-2 rounded-sm flex items-center justify-center transition-all ${
                            task.completed
                              ? 'bg-black border-black'
                              : 'border-gray-400 hover:border-gray-600'
                          }`}
                          onClick={() => toggleTaskCompletion(block.id, task.id, task.completed)}
                        >
                          {task.completed && (
                            <Check className="h-3 w-3 text-white stroke-2" />
                          )}
                        </button>
                        <span
                          className={`flex-1 text-[15px] font-light ${
                            task.completed ? 'line-through text-gray-600' : 'text-black'
                          }`}
                        >
                          {task.title}
                        </span>
                        <div className="relative flex items-center">
                          {showTaskMenu === task.id && (
                            <div className="absolute right-6 flex items-center animate-slide-in">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteTask(block.id, task.id)
                                }}
                                className="p-1.5 hover:bg-red-50 rounded-md transition-colors bg-white shadow-sm"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </button>
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowTaskMenu(showTaskMenu === task.id ? null : task.id)
                            }}
                            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <MoreVertical className="h-3 w-3 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {showTaskInput[block.id] ? (
                      <div className="flex items-center gap-2 py-2">
                        <Input
                          value={newTaskInputs[block.id] || ''}
                          onChange={(e) => setNewTaskInputs(prev => ({ ...prev, [block.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && addTask(block.id)}
                          placeholder="タスク名を入力"
                          className="flex-1 h-8 text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          className="h-8 px-4 bg-black hover:bg-gray-800 text-white"
                          onClick={() => addTask(block.id)}
                          disabled={!newTaskInputs[block.id]}
                        >
                          追加
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-8 h-8"
                          onClick={() => {
                            setShowTaskInput(prev => ({ ...prev, [block.id]: false }))
                            setNewTaskInputs(prev => ({ ...prev, [block.id]: '' }))
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        className="flex items-center gap-2 py-2 text-gray-700 hover:text-black transition-colors font-light"
                        onClick={() => setShowTaskInput(prev => ({ ...prev, [block.id]: true }))}
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-[15px]">新しいタスクを追加</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Block Form */}
      {showBlockForm ? (
        <div 
          className="bg-white border border-gray-200 rounded-lg p-4 mb-5 add-form"
          onClick={(e) => {
            // クリックターゲットがフォーム内の要素でない場合はキャンセル
            if (e.target === e.currentTarget) {
              setShowBlockForm(false)
              setNewBlockTitle('')
              setNewBlockTime('00:00')
            }
          }}
        >
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowTimePicker(true)}
              className="flex items-center gap-2 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors hover:border-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm font-mono mr-2"
            >
              <Clock className="h-4 w-4 text-gray-500" />
              {newBlockTime}
            </button>
            <Input
              value={newBlockTitle}
              onChange={(e) => setNewBlockTitle(e.target.value)}
              placeholder="時間ブロックのタイトル"
              className="flex-1 mr-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowBlockForm(false)
                  setNewBlockTitle('')
                  setNewBlockTime('00:00')
                } else if (e.key === 'Enter' && newBlockTitle && newBlockTime) {
                  addTimeBlock()
                }
              }}
            />
            <Button
              onClick={addTimeBlock}
              disabled={!newBlockTitle || !newBlockTime}
              size="icon"
              className="h-9 w-9 bg-black hover:bg-gray-800"
            >
              <Check className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
      ) : (
        <button 
          className="w-full border border-dashed border-gray-400 rounded-lg p-5 flex items-center justify-center gap-2 text-gray-700 hover:border-black hover:text-black transition-all font-light mb-1"
          onClick={() => setShowBlockForm(true)}
        >
          <Plus className="h-4 w-4" />
          <span className="text-[15px]">新しい時間ブロック</span>
        </button>
      )}

      </div>

      {/* Time Picker Modal for New Block */}
      <TimePickerModal
        isOpen={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onSelect={(time) => {
          setNewBlockTime(time)
          setShowTimePicker(false)
        }}
        initialTime={newBlockTime}
      />

      {/* Time Picker Modal for Edit Block */}
      <TimePickerModal
        isOpen={showEditTimePicker}
        onClose={() => setShowEditTimePicker(false)}
        onSelect={(time) => {
          setEditBlockTime(time)
          setShowEditTimePicker(false)
        }}
        initialTime={editBlockTime}
      />
    </MobileLayout>
  )
}