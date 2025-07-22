'use client'

import { Suspense } from 'react'
import { TodoPageClient } from '@/components/todos/TodoPageClient'
import { PageSkeleton } from '@/components/layout/PageSkeleton'

export default function TodoPage() {
  return (
    <Suspense fallback={<PageSkeleton title="ToDo" />}>
      <TodoPageClient />
    </Suspense>
  )
}