import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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

export function useTodos() {
  const queryClient = useQueryClient()

  const { data: todos = [], isLoading, error } = useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      const response = await fetch('/api/todos')
      if (!response.ok) {
        throw new Error('Failed to fetch todos')
      }
      return response.json()
    },
  })

  // Add todo mutation
  const addTodoMutation = useMutation({
    mutationFn: async (newTodo: { 
      title: string; 
      description?: string; 
      taskType: 'routine' | 'spot'; 
      important: boolean; 
      dueDate?: string 
    }) => {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo)
      })
      if (!response.ok) throw new Error('Failed to add todo')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    }
  })

  // Update todo mutation
  const updateTodoMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Todo> & { id: string }) => {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!response.ok) throw new Error('Failed to update todo')
      return response.json()
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const previousTodos = queryClient.getQueryData(['todos'])
      
      queryClient.setQueryData(['todos'], (old: Todo[] = []) => {
        return old.map(todo => 
          todo.id === id ? { ...todo, ...updates } : todo
        )
      })
      
      return { previousTodos }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['todos'], context?.previousTodos)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    }
  })

  // Toggle todo mutation
  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      })
      if (!response.ok) throw new Error('Failed to toggle todo')
      return response.json()
    },
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const previousTodos = queryClient.getQueryData(['todos'])
      
      queryClient.setQueryData(['todos'], (old: Todo[] = []) => {
        return old.map(todo => 
          todo.id === id ? { ...todo, completed } : todo
        )
      })
      
      return { previousTodos }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['todos'], context?.previousTodos)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    }
  })

  // Delete todo mutation
  const deleteTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete todo')
      return response.json()
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const previousTodos = queryClient.getQueryData(['todos'])
      
      queryClient.setQueryData(['todos'], (old: Todo[] = []) => {
        return old.filter(todo => todo.id !== id)
      })
      
      return { previousTodos }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['todos'], context?.previousTodos)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    }
  })

  return {
    todos,
    isLoading,
    error,
    addTodo: addTodoMutation.mutate,
    updateTodo: updateTodoMutation.mutate,
    toggleTodo: toggleTodoMutation.mutate,
    deleteTodo: deleteTodoMutation.mutate,
  }
}