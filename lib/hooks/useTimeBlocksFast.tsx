import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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

// 高速化されたuseTimeBlocks
export function useTimeBlocksFast(page: number) {
  const queryClient = useQueryClient()

  const { data: timeBlocks = [], isLoading, error } = useQuery({
    queryKey: ['timeBlocksFast', page],
    queryFn: async () => {
      const response = await fetch(`/api/time-blocks-fast?page=${page}&mode=page`)
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return []
        }
        const error = new Error('Failed to fetch time blocks') as Error & { status: number }
        error.status = response.status
        throw error
      }
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ（延長）
    gcTime: 30 * 60 * 1000, // 30分間メモリ保持（延長）
    refetchOnWindowFocus: false,
    refetchOnMount: false, // キャッシュ優先
    refetchOnReconnect: false, // 再接続時も再取得しない
  })

  // 楽観的更新による高速操作
  const addTimeBlockMutation = useMutation({
    mutationFn: async ({ title, startTime, pageNumber }: { title: string; startTime: string; pageNumber: number }) => {
      const response = await fetch('/api/time-blocks-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'addTimeBlock',
          data: { title, startTime, pageNumber }
        })
      })
      if (!response.ok) throw new Error('Failed to add time block')
      return response.json()
    },
    onMutate: async ({ title, startTime }) => {
      await queryClient.cancelQueries({ queryKey: ['timeBlocksFast', page] })
      const previousTimeBlocks = queryClient.getQueryData(['timeBlocksFast', page])
      
      queryClient.setQueryData(['timeBlocksFast', page], (old: TimeBlock[] = []) => {
        const newBlock = {
          id: `temp-${Date.now()}`,
          title,
          startTime,
          orderIndex: old.length,
          completionRate: 0,
          tasks: []
        }
        return [...old, newBlock]
      })
      
      return { previousTimeBlocks }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['timeBlocksFast', page], context?.previousTimeBlocks)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['timeBlocksFast', page] })
    }
  })

  const deleteTimeBlockMutation = useMutation({
    mutationFn: async (blockId: string) => {
      const response = await fetch('/api/time-blocks-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'deleteTimeBlock',
          blockId
        })
      })
      if (!response.ok) throw new Error('Failed to delete time block')
      return response.json()
    },
    onMutate: async (blockId) => {
      await queryClient.cancelQueries({ queryKey: ['timeBlocksFast', page] })
      const previousTimeBlocks = queryClient.getQueryData(['timeBlocksFast', page])
      
      queryClient.setQueryData(['timeBlocksFast', page], (old: TimeBlock[] = []) => {
        return old.filter(block => block.id !== blockId)
      })
      
      return { previousTimeBlocks }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['timeBlocksFast', page], context?.previousTimeBlocks)
    }
  })

  const addTaskMutation = useMutation({
    mutationFn: async ({ blockId, title }: { blockId: string; title: string }) => {
      const response = await fetch('/api/time-blocks-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'addTask',
          blockId,
          data: { title }
        })
      })
      if (!response.ok) throw new Error('Failed to add task')
      return response.json()
    },
    onMutate: async ({ blockId, title }) => {
      await queryClient.cancelQueries({ queryKey: ['timeBlocksFast', page] })
      const previousTimeBlocks = queryClient.getQueryData(['timeBlocksFast', page])
      
      queryClient.setQueryData(['timeBlocksFast', page], (old: TimeBlock[] = []) => {
        const newTask = {
          id: `temp-${Date.now()}`,
          title,
          completed: false,
          orderIndex: old.find(b => b.id === blockId)?.tasks.length || 0
        }
        
        return old.map(block => {
          if (block.id === blockId) {
            return { ...block, tasks: [...block.tasks, newTask] }
          }
          return block
        })
      })
      
      return { previousTimeBlocks }
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(['timeBlocksFast', page], context?.previousTimeBlocks)
    }
  })

  const deleteTaskMutation = useMutation({
    mutationFn: async ({ blockId, taskId }: { blockId: string; taskId: string }) => {
      if (taskId.startsWith('temp-')) {
        return { success: true }
      }
      const response = await fetch('/api/time-blocks-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'deleteTask',
          blockId,
          data: { taskId }
        })
      })
      if (!response.ok) throw new Error('Failed to delete task')
      return response.json()
    },
    onMutate: async ({ blockId, taskId }) => {
      await queryClient.cancelQueries({ queryKey: ['timeBlocksFast', page] })
      const previousTimeBlocks = queryClient.getQueryData(['timeBlocksFast', page])
      
      queryClient.setQueryData(['timeBlocksFast', page], (old: TimeBlock[] = []) => {
        return old.map(block => {
          if (block.id === blockId) {
            return { ...block, tasks: block.tasks.filter(task => task.id !== taskId) }
          }
          return block
        })
      })
      
      return { previousTimeBlocks }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['timeBlocksFast', page], context?.previousTimeBlocks)
    }
  })

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ blockId, taskId, completed }: { blockId: string; taskId: string; completed: boolean }) => {
      const response = await fetch('/api/time-blocks-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'toggleTask',
          blockId,
          data: { taskId, completed }
        })
      })
      if (!response.ok) throw new Error('Failed to toggle task')
      return response.json()
    },
    onMutate: async ({ blockId, taskId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['timeBlocksFast', page] })
      const previousTimeBlocks = queryClient.getQueryData(['timeBlocksFast', page])
      
      queryClient.setQueryData(['timeBlocksFast', page], (old: TimeBlock[] = []) => {
        return old.map(block => {
          if (block.id === blockId) {
            return {
              ...block,
              tasks: block.tasks.map(task => 
                task.id === taskId ? { ...task, completed } : task
              )
            }
          }
          return block
        })
      })
      
      return { previousTimeBlocks }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['timeBlocksFast', page], context?.previousTimeBlocks)
    }
  })

  const updateTimeBlockMutation = useMutation({
    mutationFn: async ({ blockId, title, startTime }: { blockId: string; title: string; startTime: string }) => {
      const response = await fetch('/api/time-blocks-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'updateTimeBlock',
          blockId,
          data: { title, startTime }
        })
      })
      if (!response.ok) throw new Error('Failed to update time block')
      return response.json()
    },
    onMutate: async ({ blockId, title, startTime }) => {
      await queryClient.cancelQueries({ queryKey: ['timeBlocksFast', page] })
      const previousTimeBlocks = queryClient.getQueryData(['timeBlocksFast', page])
      
      queryClient.setQueryData(['timeBlocksFast', page], (old: TimeBlock[] = []) => {
        return old.map(block => {
          if (block.id === blockId) {
            return { ...block, title, startTime }
          }
          return block
        })
      })
      
      return { previousTimeBlocks }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['timeBlocksFast', page], context?.previousTimeBlocks)
    }
  })

  return {
    timeBlocks,
    isLoading,
    error,
    addTimeBlock: addTimeBlockMutation.mutate,
    deleteTimeBlock: deleteTimeBlockMutation.mutate,
    addTask: addTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    toggleTask: toggleTaskMutation.mutate,
    updateTimeBlock: updateTimeBlockMutation.mutate,
  }
} 