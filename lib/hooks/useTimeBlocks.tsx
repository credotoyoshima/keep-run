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

export function useTimeBlocks(page: number) {
  const queryClient = useQueryClient()

  const { data: timeBlocks = [], isLoading, error } = useQuery({
    queryKey: ['timeBlocks', page],
    queryFn: async () => {
      const response = await fetch(`/api/user-blocks?page=${page}`)
      if (!response.ok) {
        // 401/403の場合は空配列を返す
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
  })

  // Add time block mutation
  const addTimeBlockMutation = useMutation({
    mutationFn: async ({ title, startTime, pageNumber }: { title: string; startTime: string; pageNumber: number }) => {
      const response = await fetch('/api/user-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, startTime, pageNumber })
      })
      if (!response.ok) throw new Error('Failed to add time block')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeBlocks', page] })
    }
  })

  // Delete time block mutation
  const deleteTimeBlockMutation = useMutation({
    mutationFn: async (blockId: string) => {
      const response = await fetch(`/api/user-blocks?blockId=${blockId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete time block')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeBlocks', page] })
    }
  })

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async ({ blockId, title }: { blockId: string; title: string }) => {
      const response = await fetch('/api/day', {
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
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['timeBlocks', page] })
      
      // Snapshot the previous value
      const previousTimeBlocks = queryClient.getQueryData(['timeBlocks', page])
      
      // Optimistically update to the new value
      queryClient.setQueryData(['timeBlocks', page], (old: TimeBlock[] = []) => {
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
      
      // Return a context object with the snapshotted value
      return { previousTimeBlocks }
    },
    onError: (err, newTodo, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['timeBlocks', page], context?.previousTimeBlocks)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['timeBlocks', page] })
    }
  })

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async ({ blockId, taskId }: { blockId: string; taskId: string }) => {
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
      return response.json()
    },
    onMutate: async ({ blockId, taskId }) => {
      await queryClient.cancelQueries({ queryKey: ['timeBlocks', page] })
      const previousTimeBlocks = queryClient.getQueryData(['timeBlocks', page])
      
      queryClient.setQueryData(['timeBlocks', page], (old: TimeBlock[] = []) => {
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
      queryClient.setQueryData(['timeBlocks', page], context?.previousTimeBlocks)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['timeBlocks', page] })
    }
  })

  // Toggle task mutation
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ blockId, taskId, completed }: { blockId: string; taskId: string; completed: boolean }) => {
      const response = await fetch('/api/day', {
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
      await queryClient.cancelQueries({ queryKey: ['timeBlocks', page] })
      const previousTimeBlocks = queryClient.getQueryData(['timeBlocks', page])
      
      queryClient.setQueryData(['timeBlocks', page], (old: TimeBlock[] = []) => {
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
      queryClient.setQueryData(['timeBlocks', page], context?.previousTimeBlocks)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['timeBlocks', page] })
    }
  })

  // Update time block mutation
  const updateTimeBlockMutation = useMutation({
    mutationFn: async ({ blockId, title, startTime }: { blockId: string; title: string; startTime: string }) => {
      const response = await fetch('/api/day', {
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
      await queryClient.cancelQueries({ queryKey: ['timeBlocks', page] })
      const previousTimeBlocks = queryClient.getQueryData(['timeBlocks', page])
      
      queryClient.setQueryData(['timeBlocks', page], (old: TimeBlock[] = []) => {
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
      queryClient.setQueryData(['timeBlocks', page], context?.previousTimeBlocks)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['timeBlocks', page] })
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