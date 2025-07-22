/**
 * Updated useDayStartTime hook that uses the new sync mechanism
 * This is a wrapper around useDayStartTimeV2 for backward compatibility
 */

import { useEffect } from 'react'
import { useDayStartTimeV2 } from './useDayStartTimeV2'
import { migrateDayStartTime, needsMigration } from '@/lib/utils/migrateDayStartTime'

export function useDayStartTime() {
  const {
    dayStartTime,
    updateDayStartTime: updateV2,
    isLoading,
    isSyncing,
    syncStatus,
    error,
    refetch,
    forceSync
  } = useDayStartTimeV2()

  // Run migration on mount if needed
  useEffect(() => {
    const runMigration = async () => {
      if (needsMigration()) {
        const result = await migrateDayStartTime()
        if (result.migrated) {
          console.log('Migrated dayStartTime to new format')
          // Force sync after migration
          await forceSync()
        }
      }
    }

    runMigration()
  }, [forceSync])

  // Backward compatible update function
  const updateDayStartTime = async (newTime: string) => {
    const result = await updateV2(newTime)
    
    // For backward compatibility, return the same structure
    if (result.success) {
      return { success: true }
    } else {
      return { 
        success: false, 
        error: result.error || '設定の保存に失敗しました' 
      }
    }
  }

  // Return backward compatible interface
  return {
    dayStartTime,
    updateDayStartTime,
    isLoading,
    error,
    refetch,
    // New properties for enhanced functionality
    isSyncing,
    syncStatus,
    forceSync
  }
}