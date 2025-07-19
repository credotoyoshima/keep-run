import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Evaluation {
  id: string
  date: Date
  goalAchievement: number
  workLifeBalance: number
  relationships: number
  personalGrowth: number
  healthWellness: number
  enjoymentSatisfaction: number
  stressAnxiety: number
  gratitudePositivity: number
  notes?: string
  totalScore: number
  createdAt: Date
  updatedAt: Date
}

export function useEvaluations(year?: number, month?: number) {
  const queryClient = useQueryClient()

  const { data: evaluations = [], isLoading, error } = useQuery({
    queryKey: ['evaluations', year, month],
    queryFn: async () => {
      let url = '/api/evaluations'
      const params = new URLSearchParams()
      if (year) params.append('year', year.toString())
      if (month) params.append('month', month.toString())
      if (params.toString()) url += `?${params.toString()}`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch evaluations')
      }
      return response.json()
    },
  })

  // Add/Update evaluation mutation
  const saveEvaluationMutation = useMutation({
    mutationFn: async (evaluation: Omit<Evaluation, 'id' | 'createdAt' | 'updatedAt' | 'totalScore'>) => {
      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evaluation)
      })
      if (!response.ok) throw new Error('Failed to save evaluation')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] })
    }
  })

  // Delete evaluation mutation
  const deleteEvaluationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/evaluations/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete evaluation')
      return response.json()
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['evaluations'] })
      const previousEvaluations = queryClient.getQueryData(['evaluations'])
      
      queryClient.setQueryData(['evaluations'], (old: Evaluation[] = []) => {
        return old.filter(evaluation => evaluation.id !== id)
      })
      
      return { previousEvaluations }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['evaluations'], context?.previousEvaluations)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] })
    }
  })

  return {
    evaluations,
    isLoading,
    error,
    saveEvaluation: saveEvaluationMutation.mutate,
    deleteEvaluation: deleteEvaluationMutation.mutate,
  }
}

export function useEvaluationByDate(date: Date) {
  const dateString = date.toISOString().split('T')[0]

  const { data: evaluation, isLoading, error } = useQuery({
    queryKey: ['evaluation', dateString],
    queryFn: async () => {
      const response = await fetch(`/api/evaluations/date/${dateString}`)
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error('Failed to fetch evaluation')
      }
      return response.json()
    },
  })

  return {
    evaluation,
    isLoading,
    error,
  }
}