import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createSyncedStorage, type SyncedValue } from '@/lib/utils/syncedStorage'

const DEFAULT_DAY_START_TIME = '05:00'
const STORAGE_KEY = 'dayStartTime'
const STORAGE_VERSION = 2 // Increment when storage format changes

// Time format validator
const isValidTimeFormat = (value: unknown): value is string => {
  return typeof value === 'string' && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)
}

// Create synced storage instance
const dayStartTimeStorage = createSyncedStorage({
  key: STORAGE_KEY,
  defaultValue: DEFAULT_DAY_START_TIME,
  version: STORAGE_VERSION,
  validator: isValidTimeFormat,
  maxStaleTime: 10 * 60 * 1000 // 10 minutes
})

export interface UseDayStartTimeResult {
  dayStartTime: string
  updateDayStartTime: (newTime: string) => Promise<{ success: boolean; error?: string }>
  isLoading: boolean
  isSyncing: boolean
  syncStatus: SyncedValue<string>['syncStatus']
  error: string | null
  refetch: () => Promise<void>
  forceSync: () => Promise<void>
}

export function useDayStartTimeV2(): UseDayStartTimeResult {
  const [dayStartTime, setDayStartTime] = useState<string>(DEFAULT_DAY_START_TIME)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncedValue<string>['syncStatus']>('pending')
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const supabase = createClient()
  const syncInProgress = useRef(false)
  const retryCount = useRef(0)
  const maxRetries = 3

  // Sync with database
  const syncWithDatabase = useCallback(async (skipLocalCheck = false): Promise<void> => {
    // Prevent concurrent syncs
    if (syncInProgress.current) return
    syncInProgress.current = true

    try {
      setIsSyncing(true)
      setError(null)

      // Check if sync is needed
      if (!skipLocalCheck && !dayStartTimeStorage.needsSync()) {
        const local = dayStartTimeStorage.getLocal()
        if (local) {
          setDayStartTime(local.value)
          setSyncStatus(local.syncStatus)
          return
        }
      }

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setIsAuthenticated(false)
        // Use local value if available, otherwise default
        const local = dayStartTimeStorage.getLocal()
        if (local) {
          setDayStartTime(local.value)
          setSyncStatus('synced') // Consider local-only as synced for non-authenticated users
        }
        return
      }

      setIsAuthenticated(true)

      // Fetch from database
      const response = await fetch('/api/user/settings')
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`)
      }

      const data = await response.json()
      const dbValue = data.dayStartTime || DEFAULT_DAY_START_TIME

      // Check for conflicts
      const local = dayStartTimeStorage.getLocal()
      if (local && local.value !== dbValue && local.syncStatus === 'pending') {
        // We have a local change that hasn't been synced
        // In this case, we'll keep the local value and try to sync it
        console.warn('Conflict detected: local value differs from database')
        // You could implement more sophisticated conflict resolution here
        // For now, we'll prefer the database value
      }

      // Update local storage and state
      dayStartTimeStorage.markSynced(dbValue)
      setDayStartTime(dbValue)
      setSyncStatus('synced')
      retryCount.current = 0

    } catch (error) {
      console.error('Error syncing day start time:', error)
      const errorMessage = error instanceof Error ? error.message : 'Sync failed'
      
      setError(errorMessage)
      setSyncStatus('error')
      dayStartTimeStorage.markError(errorMessage)

      // Implement exponential backoff retry
      if (retryCount.current < maxRetries) {
        retryCount.current++
        const delay = Math.min(1000 * Math.pow(2, retryCount.current), 10000)
        setTimeout(() => syncWithDatabase(skipLocalCheck), delay)
      }
    } finally {
      syncInProgress.current = false
      setIsSyncing(false)
      setIsLoading(false)
    }
  }, [supabase])

  // Update day start time
  const updateDayStartTime = useCallback(async (newTime: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate input
      if (!isValidTimeFormat(newTime)) {
        return { success: false, error: 'Invalid time format. Use HH:MM' }
      }

      // Optimistic update
      setDayStartTime(newTime)
      dayStartTimeStorage.setLocal(newTime, 'pending')
      setSyncStatus('pending')
      
      // Emit custom event for same-tab components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dayStartTimeChanged', { detail: newTime }))
      }

      // If not authenticated, we're done
      if (!isAuthenticated) {
        setSyncStatus('synced') // Consider local-only as synced
        return { success: true }
      }

      // Update database
      setIsSyncing(true)
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dayStartTime: newTime })
      })

      if (!response.ok) {
        throw new Error('Failed to update settings')
      }

      // Mark as synced
      dayStartTimeStorage.markSynced(newTime)
      setSyncStatus('synced')
      setError(null)
      
      return { success: true }

    } catch (error) {
      console.error('Error updating day start time:', error)
      const errorMessage = error instanceof Error ? error.message : 'Update failed'
      
      // Revert on error
      const previous = dayStartTimeStorage.getLocal()
      const fallbackValue = previous?.value || DEFAULT_DAY_START_TIME
      
      setDayStartTime(fallbackValue)
      dayStartTimeStorage.markError(errorMessage)
      setSyncStatus('error')
      setError(errorMessage)
      
      return { success: false, error: errorMessage }
    } finally {
      setIsSyncing(false)
    }
  }, [isAuthenticated])

  // Force sync (bypass cache)
  const forceSync = useCallback(async () => {
    await syncWithDatabase(true)
  }, [syncWithDatabase])

  // Initialize on mount
  useEffect(() => {
    // Get initial value from local storage immediately
    const local = dayStartTimeStorage.getLocal()
    if (local) {
      setDayStartTime(local.value)
      setSyncStatus(local.syncStatus)
      
      // If the local value is fresh and synced, skip initial DB sync
      if (local.syncStatus === 'synced' && !dayStartTimeStorage.needsSync()) {
        setIsLoading(false)
        
        // Still check auth status in background
        supabase.auth.getUser().then(({ data: { user } }) => {
          setIsAuthenticated(!!user)
        })
        
        return
      }
    }

    // Perform initial sync
    syncWithDatabase()
  }, [syncWithDatabase, supabase.auth])

  // Handle storage events (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        dayStartTimeStorage.handleStorageEvent(event)
      }
    }

    // Subscribe to storage changes
    const unsubscribe = dayStartTimeStorage.subscribe((syncedValue) => {
      setDayStartTime(syncedValue.value)
      setSyncStatus(syncedValue.syncStatus)
    })

    // Handle custom events (same-tab sync)
    const handleCustomEvent = (event: CustomEvent) => {
      if (isValidTimeFormat(event.detail)) {
        setDayStartTime(event.detail)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('dayStartTimeChanged', handleCustomEvent as EventListener)

    return () => {
      unsubscribe()
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('dayStartTimeChanged', handleCustomEvent as EventListener)
    }
  }, [])

  // Periodic background sync (every 5 minutes when tab is visible)
  useEffect(() => {
    if (!isAuthenticated) return

    let syncInterval: NodeJS.Timeout

    const startBackgroundSync = () => {
      syncInterval = setInterval(() => {
        if (document.visibilityState === 'visible' && dayStartTimeStorage.needsSync()) {
          syncWithDatabase()
        }
      }, 5 * 60 * 1000) // 5 minutes
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if we need to sync when tab becomes visible
        if (dayStartTimeStorage.needsSync()) {
          syncWithDatabase()
        }
      }
    }

    startBackgroundSync()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(syncInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, syncWithDatabase])

  return {
    dayStartTime,
    updateDayStartTime,
    isLoading,
    isSyncing,
    syncStatus,
    error,
    refetch: syncWithDatabase,
    forceSync
  }
}