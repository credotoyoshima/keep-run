import React from 'react'
import { Cloud, CloudOff, AlertCircle, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SyncedValue } from '@/lib/utils/syncedStorage'

interface SyncStatusIndicatorProps {
  syncStatus: SyncedValue<any>['syncStatus']
  isSyncing?: boolean
  error?: string | null
  className?: string
  showText?: boolean
}

export function SyncStatusIndicator({
  syncStatus,
  isSyncing,
  error,
  className,
  showText = false
}: SyncStatusIndicatorProps) {
  const getStatusInfo = () => {
    if (isSyncing) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        text: 'Syncing...',
        className: 'text-blue-500'
      }
    }

    switch (syncStatus) {
      case 'synced':
        return {
          icon: <Cloud className="h-4 w-4" />,
          text: 'Synced',
          className: 'text-green-500'
        }
      
      case 'pending':
        return {
          icon: <CloudOff className="h-4 w-4" />,
          text: 'Pending sync',
          className: 'text-yellow-500'
        }
      
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: error || 'Sync error',
          className: 'text-red-500'
        }
      
      case 'stale':
        return {
          icon: <CloudOff className="h-4 w-4" />,
          text: 'Outdated',
          className: 'text-orange-500'
        }
      
      default:
        return {
          icon: <Cloud className="h-4 w-4" />,
          text: 'Unknown',
          className: 'text-gray-500'
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        statusInfo.className,
        className
      )}
      title={statusInfo.text}
    >
      {statusInfo.icon}
      {showText && (
        <span className="text-sm">{statusInfo.text}</span>
      )}
    </div>
  )
}

/**
 * Compact sync status dot indicator
 */
export function SyncStatusDot({
  syncStatus,
  isSyncing,
  className
}: Omit<SyncStatusIndicatorProps, 'showText' | 'error'>) {
  const getStatusColor = () => {
    if (isSyncing) return 'bg-blue-500 animate-pulse'
    
    switch (syncStatus) {
      case 'synced':
        return 'bg-green-500'
      case 'pending':
        return 'bg-yellow-500'
      case 'error':
        return 'bg-red-500'
      case 'stale':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div
      className={cn(
        'h-2 w-2 rounded-full',
        getStatusColor(),
        className
      )}
      title={syncStatus}
    />
  )
}