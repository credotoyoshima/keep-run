import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4'
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-gray-200 border-t-black',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="読み込み中"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// 中央配置用のラッパーコンポーネント
export function LoadingSpinnerCenter({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size={size} className={className} />
        <p className="text-sm text-gray-500 font-medium">読み込み中...</p>
      </div>
    </div>
  )
}

// ページ全体のローディング用
export function LoadingSpinnerFull({ size = 'lg' }: Pick<LoadingSpinnerProps, 'size'>) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size={size} />
        <p className="text-sm text-gray-500 font-medium">読み込み中...</p>
      </div>
    </div>
  )
}