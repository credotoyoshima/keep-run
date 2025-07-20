import { Suspense } from 'react'
import { AnalyticsPageClient } from '@/components/evaluations/AnalyticsPageClient'
import { PageSkeleton } from '@/components/layout/PageSkeleton'

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<PageSkeleton title="評価" />}>
      <AnalyticsPageClient />
    </Suspense>
  )
}