import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

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
  const [localTimeBlocks, setLocalTimeBlocks] = useState<TimeBlock[]>([])

  const { data: timeBlocks = [], isLoading, error } = useQuery({
    queryKey: ['timeBlocks', page],
    queryFn: async () => {
      const response = await fetch(`/api/user-blocks?page=${page}`)
      if (!response.ok) {
        throw new Error('Failed to fetch time blocks')
      }
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  // Sync local state with query data
  useEffect(() => {
    setLocalTimeBlocks(timeBlocks)
  }, [timeBlocks])

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
      // Optimistically update the UI
      const newTask = {
        id: `temp-${Date.now()}`,
        title,
        completed: false,
        orderIndex: localTimeBlocks.find(b => b.id === blockId)?.tasks.length || 0
      }
      
      setLocalTimeBlocks(prev => prev.map(block => {
        if (block.id === blockId) {
          return { ...block, tasks: [...block.tasks, newTask] }
        }
        return block
      }))
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
      // Optimistically update the UI
      setLocalTimeBlocks(prev => prev.map(block => {
        if (block.id === blockId) {
          return { ...block, tasks: block.tasks.filter(task => task.id !== taskId) }
        }
        return block
      }))
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
      // Optimistically update the UI
      setLocalTimeBlocks(prev => prev.map(block => {
        if (block.id === blockId) {
          return {
            ...block,
            tasks: block.tasks.map(task => 
              task.id === taskId ? { ...task, completed } : task
            )
          }
        }
        return block
      }))
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
      // Optimistically update the UI
      setLocalTimeBlocks(prev => prev.map(block => {
        if (block.id === blockId) {
          return { ...block, title, startTime }
        }
        return block
      }))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['timeBlocks', page] })
    }
  })

  return {
    timeBlocks: localTimeBlocks,
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