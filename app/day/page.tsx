import { Suspense } from 'react'
import { DayPageClient } from '@/components/active/DayPageClient'
import { PageSkeleton } from '@/components/layout/PageSkeleton'

export default function DayPage() {
  return (
    <Suspense fallback={<PageSkeleton title="DAY" />}>
      <DayPageClient />
    </Suspense>
  )
}