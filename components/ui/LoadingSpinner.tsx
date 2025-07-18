import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <div 
        className={cn(
          "absolute inset-0 rounded-full border-2 border-gray-200",
          sizeClasses[size]
        )} 
      />
      <div
        className={cn(
          "absolute inset-0 rounded-full border-2 border-transparent border-t-black animate-spin",
          sizeClasses[size]
        )}
        style={{ animationDuration: '0.6s' }}
        role="status"
        aria-label="読み込み中"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  )
}

// 中央配置用のラッパーコンポーネント
export function LoadingSpinnerCenter({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size={size} className={className} />
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 animate-pulse">●</span>
          <span className="text-xs text-gray-400 animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
          <span className="text-xs text-gray-400 animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
        </div>
      </div>
    </div>
  )
}

// ページ全体のローディング用
export function LoadingSpinnerFull({ size = 'lg' }: Pick<LoadingSpinnerProps, 'size'>) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size={size} />
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 animate-pulse">●</span>
          <span className="text-xs text-gray-400 animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
          <span className="text-xs text-gray-400 animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
        </div>
      </div>
    </div>
  )
}