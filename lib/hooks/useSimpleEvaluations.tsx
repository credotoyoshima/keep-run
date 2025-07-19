import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface SimpleEvaluation {
  id: string
  date: string
  rating: number
  comment: string
  title: string
}

interface EvaluationResponse {
  evaluations: SimpleEvaluation[]
}

interface SaveEvaluationPayload {
  date: string
  rating: number
  comment: string
}

export function useSimpleEvaluations() {
  const queryClient = useQueryClient()

  const { data: evaluationsData, isLoading, error } = useQuery({
    queryKey: ['simpleEvaluations'],
    queryFn: async () => {
      const response = await fetch('/api/evaluations')
      if (!response.ok) {
        throw new Error('Failed to fetch evaluations')
      }
      return response.json() as Promise<EvaluationResponse>
    },
    staleTime: 2 * 60 * 1000, // 2分間キャッシュ
  })

  const evaluations = evaluationsData?.evaluations || []

  // 評価保存・更新 mutation
  const saveEvaluationMutation = useMutation({
    mutationFn: async (evaluationData: SaveEvaluationPayload) => {
      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evaluationData)
      })
      if (!response.ok) throw new Error('Failed to save evaluation')
      return response.json()
    },
    onMutate: async (newEvaluation) => {
      await queryClient.cancelQueries({ queryKey: ['simpleEvaluations'] })
      const previousData = queryClient.getQueryData(['simpleEvaluations'])
      
      // 楽観的更新
      queryClient.setQueryData(['simpleEvaluations'], (old: EvaluationResponse | undefined) => {
        if (!old) return { evaluations: [] }
        
        const existingIndex = old.evaluations.findIndex(e => e.date === newEvaluation.date)
        const updatedEvaluation = {
          id: existingIndex >= 0 ? old.evaluations[existingIndex].id : `temp-${Date.now()}`,
          date: newEvaluation.date,
          rating: newEvaluation.rating,
          comment: newEvaluation.comment,
          title: ''
        }
        
        if (existingIndex >= 0) {
          // 既存の評価を更新
          const newEvaluations = [...old.evaluations]
          newEvaluations[existingIndex] = updatedEvaluation
          return { evaluations: newEvaluations }
        } else {
          // 新しい評価を追加
          return { 
            evaluations: [updatedEvaluation, ...old.evaluations].sort((a, b) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            )
          }
        }
      })
      
      return { previousData }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['simpleEvaluations'], context?.previousData)
    },
    onSuccess: (data) => {
      // サーバーからの正確なデータで楽観的更新を修正
      queryClient.setQueryData(['simpleEvaluations'], (old: EvaluationResponse | undefined) => {
        if (!old) return { evaluations: [data.evaluation] }
        
        const evaluationIndex = old.evaluations.findIndex(e => 
          e.date === data.evaluation.date || e.id.startsWith('temp-')
        )
        
        if (evaluationIndex >= 0) {
          const newEvaluations = [...old.evaluations]
          newEvaluations[evaluationIndex] = data.evaluation
          return { evaluations: newEvaluations }
        }
        
        return old
      })
    }
  })

  return {
    evaluations,
    isLoading,
    error,
    saveEvaluation: saveEvaluationMutation.mutate,
    isSaving: saveEvaluationMutation.isPending,
    saveError: saveEvaluationMutation.error
  }
} 