import dynamic from 'next/dynamic'

// DayPageClientを動的インポートで最適化
const DayPageClient = dynamic(() => import('@/components/active/DayPageClient').then(mod => ({ default: mod.DayPageClient })), {
  loading: () => (
    <div className="min-h-screen bg-gray-50">
      <div className="animate-pulse">
        <div className="bg-white border-b px-4 py-3">
          <div className="h-6 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="p-4 space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  ),
})

export default function DayPage() {
  return <DayPageClient />
}