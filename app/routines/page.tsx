import { Suspense } from 'react'
import { RoutinesPageClient } from '@/components/habits/RoutinesPageClient'
import { PageSkeleton } from '@/components/layout/PageSkeleton'

export default function RoutinesPage() {
  return (
    <Suspense fallback={<PageSkeleton title="継続" />}>
      <RoutinesPageClient />
    </Suspense>
  )
}