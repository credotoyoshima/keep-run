'use client'

import { ReactNode, useRef, useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDown } from 'lucide-react'

interface PullToRefreshProps {
  children: ReactNode
  onRefresh?: () => Promise<void>
  threshold?: number
  resistance?: number
  className?: string
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  className = ''
}: PullToRefreshProps) {
  const queryClient = useQueryClient()
  const containerRef = useRef<HTMLDivElement>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [startY, setStartY] = useState(0)
  const [canPull, setCanPull] = useState(false)
  const [showIndicator, setShowIndicator] = useState(false) // インジケーター表示制御

  // デフォルトのリフレッシュ処理
  const defaultRefresh = useCallback(async () => {
    try {
      // 全キャッシュを無効化してデータ再取得
      await queryClient.invalidateQueries()
      
      // 少し待機（ユーザー体験向上）
      await new Promise(resolve => setTimeout(resolve, 800))
    } catch (error) {
      console.log('Refresh failed:', error)
    }
  }, [queryClient])

  // リフレッシュ実行
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    setShowIndicator(true)
    
    try {
      if (onRefresh) {
        await onRefresh()
      } else {
        await defaultRefresh()
      }
      
      // リフレッシュ完了後、段階的にアニメーション（CSSトランジションのみ使用）
      // 1. 少し待ってスピナーを表示し続ける
      await new Promise(resolve => setTimeout(resolve, 600))
      
      // 2. スピナーを消す
      setShowIndicator(false)
      
      // 3. 少し待って状態を安定化
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // 4. CSSトランジションで滑らかに元の位置に戻す（requestAnimationFrame廃止）
      setIsRefreshing(false) // この時点でCSSトランジションが有効になる
      setPullDistance(0)     // CSSが自動で滑らかにアニメーション
      setIsPulling(false)
      
    } catch (error) {
      setIsRefreshing(false)
      setShowIndicator(false)
      setPullDistance(0)
      setIsPulling(false)
    }
  }, [isRefreshing, onRefresh, defaultRefresh])

  // タッチ開始
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const container = containerRef.current
    if (!container || container.scrollTop > 0 || isRefreshing) {
      setCanPull(false)
      return
    }

    setCanPull(true)
    setStartY(e.touches[0].clientY)
    setIsPulling(false)
  }, [isRefreshing])

  // タッチ移動
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!canPull || isRefreshing) return

    const container = containerRef.current
    if (!container) return

    const currentY = e.touches[0].clientY
    const deltaY = currentY - startY

    // 下向きのスワイプのみ処理
    if (deltaY > 0 && container.scrollTop === 0) {
      e.preventDefault() // 通常のスクロールを阻止
      
      setIsPulling(true)
      setShowIndicator(true)
      
      // 抵抗値を適用して自然な感じにする
      const distance = Math.min(deltaY / resistance, threshold * 1.5)
      setPullDistance(distance)
    }
  }, [canPull, isRefreshing, startY, resistance, threshold])

  // タッチ終了
  const handleTouchEnd = useCallback(() => {
    if (!isPulling || isRefreshing) {
      if (!isRefreshing) {
        setPullDistance(0)
        setIsPulling(false)
        setShowIndicator(false)
      }
      setCanPull(false)
      return
    }

    if (pullDistance >= threshold) {
      handleRefresh()
    } else {
      // アニメーション付きで元に戻す
      const startDistance = pullDistance
      const duration = 200
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeOut = 1 - Math.pow(1 - progress, 2)
        const currentDistance = startDistance * (1 - easeOut)

        setPullDistance(currentDistance)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setPullDistance(0)
          setIsPulling(false)
          setShowIndicator(false)
        }
      }

      requestAnimationFrame(animate)
    }

    setCanPull(false)
  }, [isPulling, isRefreshing, pullDistance, threshold, handleRefresh])

  // イベントリスナー設定
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // パッシブリスナーは使わずに、preventDefaultを使用
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  // プルインジケータの状態
  const getIndicatorState = () => {
    if (isRefreshing && showIndicator) return 'refreshing'
    if (pullDistance >= threshold) return 'release'
    if (isPulling && pullDistance > 0) return 'pulling'
    return 'idle'
  }

  const indicatorState = getIndicatorState()
  const indicatorOpacity = showIndicator ? Math.min(pullDistance / 30, 1) : 0
  const indicatorRotation = pullDistance >= threshold ? 180 : (pullDistance / threshold) * 180

  return (
    <div className={`relative ${className}`}>
      {/* プルインジケータ */}
      {showIndicator && (
        <div 
          className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10 transition-opacity duration-150"
          style={{
            transform: `translateX(-50%) translateY(20px)`,
            opacity: indicatorOpacity
          }}
        >
          <div className="flex flex-col items-center justify-center bg-white rounded-full shadow-lg w-12 h-12 border border-gray-100">
            {indicatorState === 'refreshing' ? (
              // モダンなスピナー（iOS風の複数点回転）
              <div className="relative w-5 h-5">
                <div className="absolute inset-0 animate-spin">
                  <div className="w-1 h-1 bg-black rounded-full absolute top-0 left-1/2 transform -translate-x-1/2"></div>
                  <div className="w-1 h-1 bg-gray-600 rounded-full absolute top-[3px] right-[3px]"></div>
                  <div className="w-1 h-1 bg-gray-500 rounded-full absolute right-0 top-1/2 transform -translate-y-1/2"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full absolute bottom-[3px] right-[3px]"></div>
                  <div className="w-1 h-1 bg-gray-300 rounded-full absolute bottom-0 left-1/2 transform -translate-x-1/2"></div>
                  <div className="w-1 h-1 bg-gray-200 rounded-full absolute bottom-[3px] left-[3px]"></div>
                  <div className="w-1 h-1 bg-gray-100 rounded-full absolute left-0 top-1/2 transform -translate-y-1/2"></div>
                  <div className="w-1 h-1 bg-gray-50 rounded-full absolute top-[3px] left-[3px]"></div>
                </div>
              </div>
            ) : (
              <ArrowDown 
                className="w-5 h-5 text-gray-600 transition-transform duration-200" 
                style={{
                  transform: `rotate(${indicatorRotation}deg)`
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overflow-x-hidden overscroll-contain"
        style={{
          transform: `translateY(${pullDistance}px)`,
          // CSSトランジションのみ使用（競合解消）
          transition: (isPulling || (isRefreshing && showIndicator)) 
            ? 'none' 
            : 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)' // より安定したイージング
        }}
      >
        {children}
      </div>
    </div>
  )
} 