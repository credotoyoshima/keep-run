'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { Input } from '@/components/ui/input'
import { TimePickerModal } from '@/components/ui/time-picker-modal'
import { useDayStartTime } from '@/lib/hooks/useDayStartTime'
import { useDayChangeDetection } from '@/lib/day-change-detector'
import { useTimeBlocks } from '@/lib/hooks/useTimeBlocks'
import { useQueryClient } from '@tanstack/react-query'
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

export function SimpleDayViewOptimized() {
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(() => {
    // localStorageから開閉状態を復元
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('expandedTimeBlocks')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          return new Set(parsed)
        } catch (e) {
          console.error('Failed to parse expanded blocks:', e)
        }
      }
    }
    return new Set()
  })
  const [newBlockTitle, setNewBlockTitle] = useState('')
  const [newBlockTime, setNewBlockTime] = useState('00:00')
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [newTaskInputs, setNewTaskInputs] = useState<{ [blockId: string]: string }>({})
  const [showTaskInput, setShowTaskInput] = useState<{ [blockId: string]: boolean }>({})
  const [swipedBlock, setSwipedBlock] = useState<string | null>(null)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [showTaskMenu, setShowTaskMenu] = useState<string | null>(null)
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null)
  const [editBlockTitle, setEditBlockTitle] = useState('')
  const [editBlockTime, setEditBlockTime] = useState('')
  const [showEditTimePicker, setShowEditTimePicker] = useState(false)
  const [currentPage, setCurrentPage] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const savedPage = localStorage.getItem('selectedDayPage')
      return savedPage ? parseInt(savedPage, 10) : 1
    }
    return 1
  })
  
  // useDayStartTimeフックを使用（最適化版）
  const { dayStartTime } = useDayStartTime()
  const queryClient = useQueryClient()
  
  // useTimeBlocksフックを使用
  const {
    timeBlocks,
    isLoading,
    addTimeBlock: addTimeBlockMutation,
    deleteTimeBlock: deleteTimeBlockMutation,
    addTask: addTaskMutation,
    deleteTask: deleteTaskMutation,
    toggleTask: toggleTaskMutation,
    updateTimeBlock: updateTimeBlockMutation,
  } = useTimeBlocks(currentPage)

  // 時間ブロックを日の開始時間に基づいて時間順にソート
  const sortedTimeBlocks = useMemo(() => {
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const base = toMin(dayStartTime)
    return [...(timeBlocks || [])].sort((a, b) => {
      const am = toMin(a.startTime), bm = toMin(b.startTime)
      const calc = (m: number) => (m < base ? m + 1440 : m)
      return calc(am) - calc(bm)
    })
  }, [timeBlocks, dayStartTime])

  // 日付変更を検出してタスクをリセット
  useDayChangeDetection(dayStartTime, async () => {
    console.log('Day changed, resetting tasks...')
    try {
      const response = await fetch('/api/day/reset-tasks', {
        method: 'POST'
      })
      if (response.ok) {
        // React Queryのキャッシュを無効化してデータを再取得
        await queryClient.invalidateQueries({ queryKey: ['timeBlocks'] })
        await queryClient.invalidateQueries({ queryKey: ['activeDay'] })
      }
    } catch (error) {
      console.error('Error resetting tasks:', error)
    }
  })

  // Custom setter for currentPage that also saves to localStorage
  const setCurrentPageAndSave = (page: number) => {
    setCurrentPage(page)
    localStorage.setItem('selectedDayPage', page.toString())
  }

  // メニューの外側をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // 三点リーダーボタンまたは削除ボタンのクリックは無視
      if (target.closest('button[aria-label="Task menu"]') || 
          target.closest('.task-delete-button')) {
        return
      }
      
      // メニューがクリックされた場合も無視
      if (target.closest('.task-menu-container')) {
        return
      }
      
      // スワイプされたブロックのボタンクリックは無視
      if (target.closest('.swipe-action-buttons')) {
        return
      }
      
      setSwipedBlock(null)
      setShowTaskMenu(null)
      
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
    // mousedownイベントを使用（clickイベントより早く発火）
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showBlockForm, newBlockTitle, newBlockTime, editingBlock, editBlockTitle, editBlockTime, showTaskMenu])

  // 初回ロード時に展開状態を設定
  useEffect(() => {
    if (sortedTimeBlocks && sortedTimeBlocks.length > 0 && typeof window !== 'undefined' && !localStorage.getItem('expandedTimeBlocks')) {
      const allBlockIds = sortedTimeBlocks.map((block: TimeBlock) => block.id)
      setExpandedBlocks(new Set(allBlockIds))
      localStorage.setItem('expandedTimeBlocks', JSON.stringify(allBlockIds))
    }
  }, [sortedTimeBlocks])

  // 時間ブロックを追加: フォームを即時閉じ（楽観的更新）
  const addTimeBlock = () => {
    if (!newBlockTitle || !newBlockTime) return

    // 即座にフォームを閉じる
    setShowBlockForm(false)
    setNewBlockTitle('')
    setNewBlockTime('00:00')

    addTimeBlockMutation({
      title: newBlockTitle,
      startTime: newBlockTime,
      pageNumber: currentPage
    }, {
      onError: (error) => {
        console.error('Error adding time block:', error)
        alert('時間ブロックの追加に失敗しました')
        // 失敗時はフォームを再表示
        setShowBlockForm(true)
      }
    })
  }

  // 時間ブロックを削除
  const deleteTimeBlock = (blockId: string) => {
    if (!confirm('この時間ブロックを削除してもよろしいですか？')) return
    
    deleteTimeBlockMutation(blockId, {
      onSuccess: () => {
        setSwipedBlock(null)
      },
      onError: (error) => {
        console.error('Error deleting time block:', error)
        alert('時間ブロックの削除に失敗しました')
      }
    })
  }

  // タスクを追加
  const addTask = async (blockId: string) => {
    const taskTitle = newTaskInputs[blockId]
    if (!taskTitle) return

    addTaskMutation({ blockId, title: taskTitle })
    setNewTaskInputs({ ...newTaskInputs, [blockId]: '' })
    setShowTaskInput({ ...showTaskInput, [blockId]: false })
  }

  // タスクを削除
  const deleteTask = (blockId: string, taskId: string) => {
    deleteTaskMutation({ blockId, taskId }, {
      onSuccess: () => {
        setShowTaskMenu(null)
      },
      onError: (error) => {
        console.error('Error deleting task:', error)
        alert('タスクの削除に失敗しました')
      }
    })
  }

  // タスクの完了状態を切り替え
  const toggleTask = async (blockId: string, taskId: string, currentCompleted: boolean) => {
    toggleTaskMutation({ blockId, taskId, completed: !currentCompleted })
  }

  // 編集開始
  const startEditingBlock = (block: TimeBlock) => {
    setEditingBlock(block)
    setEditBlockTitle(block.title)
    setEditBlockTime(block.startTime)
    setSwipedBlock(null)
  }

  // 時間ブロックを更新
  const updateTimeBlock = async () => {
    if (!editingBlock) return

    updateTimeBlockMutation({
      blockId: editingBlock.id,
      title: editBlockTitle,
      startTime: editBlockTime
    })
    
    setEditingBlock(null)
    setEditBlockTitle('')
    setEditBlockTime('')
  }

  // タッチイベントハンドラー
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

  // Initial skeleton loading state
  if (isLoading && timeBlocks.length === 0) {
    return (
      <MobileLayout title="DAY">
        <div className="p-5">
          {/* Progress Summary Skeleton */}
          <div className="bg-gray-200 animate-pulse rounded-lg p-4 mb-5">
            <div className="h-8 w-20 bg-gray-300 rounded mx-auto mb-2"></div>
            <div className="h-4 w-32 bg-gray-300 rounded ml-auto mb-2"></div>
            <div className="h-0.5 bg-gray-300 rounded"></div>
          </div>
          
          {/* Page Tabs Skeleton */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-5">
            <div className="flex-1 h-10 bg-gray-200 animate-pulse rounded-md mx-1"></div>
            <div className="flex-1 h-10 bg-gray-200 animate-pulse rounded-md mx-1"></div>
            <div className="flex-1 h-10 bg-gray-200 animate-pulse rounded-md mx-1"></div>
          </div>
          
          {/* Time Blocks Skeleton */}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-16"></div>
            ))}
          </div>
        </div>
      </MobileLayout>
    )
  }

  const completedTasks = timeBlocks?.reduce((total: number, block: TimeBlock) => 
    total + (block.tasks?.filter((task: Task) => task.completed).length || 0), 0
  ) || 0
  
  const totalTasks = timeBlocks?.reduce((total: number, block: TimeBlock) => 
    total + (block.tasks?.length || 0), 0
  ) || 0
  
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

        {/* Page Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-5">
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              currentPage === 1 
                ? 'bg-white text-black shadow-sm' 
                : 'text-gray-600 hover:text-black'
            }`}
            onClick={() => setCurrentPageAndSave(1)}
          >
            DAY1
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              currentPage === 2 
                ? 'bg-white text-black shadow-sm' 
                : 'text-gray-600 hover:text-black'
            }`}
            onClick={() => setCurrentPageAndSave(2)}
          >
            DAY2
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              currentPage === 3 
                ? 'bg-white text-black shadow-sm' 
                : 'text-gray-600 hover:text-black'
            }`}
            onClick={() => setCurrentPageAndSave(3)}
          >
            DAY3
          </button>
        </div>

        {/* Time Blocks */}
        <div className="space-y-3 mb-5" style={{ minHeight: sortedTimeBlocks.length > 0 ? '200px' : undefined }}>
          {sortedTimeBlocks && sortedTimeBlocks.length > 0 ? sortedTimeBlocks.map((block: TimeBlock) => {
            const isExpanded = expandedBlocks.has(block.id)
            const blockCompletedTasks = block.tasks?.filter((task: Task) => task.completed).length || 0
            const isCompleted = block.tasks.length > 0 && blockCompletedTasks === block.tasks.length

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
                      onClick={() => {
                        const newExpanded = new Set(expandedBlocks)
                        if (isExpanded) {
                          newExpanded.delete(block.id)
                        } else {
                          newExpanded.add(block.id)
                        }
                        setExpandedBlocks(newExpanded)
                        
                        // localStorageに保存
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('expandedTimeBlocks', JSON.stringify(Array.from(newExpanded)))
                        }
                      }}
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
                      {block.tasks.map((task: Task) => (
                        <div key={task.id} className="flex items-center gap-3 py-2">
                          <button
                            className={`w-[18px] h-[18px] border-2 rounded-sm flex items-center justify-center transition-all ${
                              task.completed
                                ? 'bg-black border-black'
                                : 'border-gray-400 hover:border-gray-600'
                            }`}
                            onClick={() => toggleTask(block.id, task.id, task.completed)}
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
                          <div className="relative flex items-center task-menu-container">
                            {showTaskMenu === task.id && (
                              <div className="absolute right-6 flex items-center animate-slide-in">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteTask(block.id, task.id)
                                  }}
                                  className="p-1.5 hover:bg-red-50 rounded-md transition-colors bg-white shadow-sm task-delete-button"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </button>
                              </div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log('Menu clicked for task:', task.id, 'Current menu:', showTaskMenu)
                                setShowTaskMenu(showTaskMenu === task.id ? null : task.id)
                              }}
                              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                              aria-label="Task menu"
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
          }) : (
            // ブロック0件時はフォームをトグルするボタンを表示
            !showBlockForm && (
              <button
                className="w-full border border-dashed border-gray-400 rounded-lg p-4 flex items-center justify-center gap-2 text-gray-700 hover:border-black hover:text-black transition-all font-light mb-1"
                onClick={() => setShowBlockForm(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="text-[15px]">新しい時間ブロックの追加</span>
              </button>
            )
          )}
        </div>

        {/* Add Time Block */}
        {showBlockForm ? (
          <div 
            className="bg-white border border-gray-200 rounded-lg p-4 mb-1 add-form"
            onClick={(e) => {
              // クリックターゲットがフォーム自体の場合はキャンセル
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
          sortedTimeBlocks && sortedTimeBlocks.length > 0 && (
            <button 
              className="w-full border border-dashed border-gray-400 rounded-lg p-4 flex items-center justify-center gap-2 text-gray-700 hover:border-black hover:text-black transition-all font-light mb-1"
              onClick={() => setShowBlockForm(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="text-[15px]">新しい時間ブロックの追加</span>
            </button>
          )
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