import { LoadingSpinnerCenter } from '../ui/LoadingSpinner'

export function PageSkeleton({ title }: { title?: string }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            {title || <div className="h-7 w-24 bg-gray-200 rounded animate-pulse" />}
          </h1>
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Loading spinner in the center */}
      <div className="flex-1 flex items-center justify-center" style={{ height: 'calc(100vh - 120px)' }}>
        <LoadingSpinnerCenter size="lg" />
      </div>

      {/* Bottom navigation skeleton */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-around py-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 p-2">
              <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-8 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}