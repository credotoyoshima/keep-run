/**
 * Generic user settings hook with robust sync
 * This demonstrates how to apply the sync pattern to multiple settings
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createSyncedStorage, type SyncedValue } from '@/lib/utils/syncedStorage'

// Define your settings interface
export interface UserSettings {
  dayStartTime: string
  theme: 'light' | 'dark' | 'system'
  language: 'ja' | 'en'
  notifications: boolean
  // Add more settings as needed
}

// Default values
const DEFAULT_SETTINGS: UserSettings = {
  dayStartTime: '05:00',
  theme: 'system',
  language: 'ja',
  notifications: true
}

// Validators for each setting
const validators = {
  dayStartTime: (value: unknown): value is string => {
    return typeof value === 'string' && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)
  },
  theme: (value: unknown): value is UserSettings['theme'] => {
    return typeof value === 'string' && ['light', 'dark', 'system'].includes(value)
  },
  language: (value: unknown): value is UserSettings['language'] => {
    return typeof value === 'string' && ['ja', 'en'].includes(value)
  },
  notifications: (value: unknown): value is boolean => {
    return typeof value === 'boolean'
  }
}

// Create synced storage for the entire settings object
const settingsStorage = createSyncedStorage({
  key: 'userSettings',
  defaultValue: DEFAULT_SETTINGS,
  version: 1,
  validator: (value: unknown): value is UserSettings => {
    if (!value || typeof value !== 'object') return false
    const v = value as any
    return (
      validators.dayStartTime(v.dayStartTime) &&
      validators.theme(v.theme) &&
      validators.language(v.language) &&
      validators.notifications(v.notifications)
    )
  },
  maxStaleTime: 10 * 60 * 1000 // 10 minutes
})

export interface UseUserSettingsResult {
  settings: UserSettings
  updateSetting: <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => Promise<{ success: boolean; error?: string }>
  updateSettings: (
    updates: Partial<UserSettings>
  ) => Promise<{ success: boolean; error?: string }>
  isLoading: boolean
  isSyncing: boolean
  syncStatus: SyncedValue<UserSettings>['syncStatus']
  error: string | null
  refetch: () => Promise<void>
  forceSync: () => Promise<void>
}

export function useUserSettings(): UseUserSettingsResult {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncedValue<UserSettings>['syncStatus']>('pending')
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const supabase = createClient()
  const syncInProgress = useRef(false)

  // Sync with database
  const syncWithDatabase = useCallback(async (skipLocalCheck = false): Promise<void> => {
    if (syncInProgress.current) return
    syncInProgress.current = true

    try {
      setIsSyncing(true)
      setError(null)

      // Check if sync is needed
      if (!skipLocalCheck && !settingsStorage.needsSync()) {
        const local = settingsStorage.getLocal()
        if (local) {
          setSettings(local.value)
          setSyncStatus(local.syncStatus)
          return
        }
      }

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setIsAuthenticated(false)
        const local = settingsStorage.getLocal()
        if (local) {
          setSettings(local.value)
          setSyncStatus('synced')
        }
        return
      }

      setIsAuthenticated(true)

      // Fetch all settings from database
      const response = await fetch('/api/user/settings')
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`)
      }

      const data = await response.json()
      
      // Merge with defaults to ensure all fields exist
      const mergedSettings: UserSettings = {
        ...DEFAULT_SETTINGS,
        ...data
      }

      // Update local storage and state
      settingsStorage.markSynced(mergedSettings)
      setSettings(mergedSettings)
      setSyncStatus('synced')

    } catch (error) {
      console.error('Error syncing settings:', error)
      const errorMessage = error instanceof Error ? error.message : 'Sync failed'
      
      setError(errorMessage)
      setSyncStatus('error')
      settingsStorage.markError(errorMessage)
    } finally {
      syncInProgress.current = false
      setIsSyncing(false)
      setIsLoading(false)
    }
  }, [supabase])

  // Update a single setting
  const updateSetting = useCallback(async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ): Promise<{ success: boolean; error?: string }> => {
    return updateSettings({ [key]: value })
  }, [])

  // Update multiple settings
  const updateSettings = useCallback(async (
    updates: Partial<UserSettings>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate updates
      for (const [key, value] of Object.entries(updates)) {
        const validator = validators[key as keyof UserSettings]
        if (validator && !validator(value)) {
          return { success: false, error: `Invalid value for ${key}` }
        }
      }

      // Create new settings object
      const newSettings = { ...settings, ...updates }

      // Optimistic update
      setSettings(newSettings)
      settingsStorage.setLocal(newSettings, 'pending')
      setSyncStatus('pending')

      // If not authenticated, we're done
      if (!isAuthenticated) {
        setSyncStatus('synced')
        return { success: true }
      }

      // Update database
      setIsSyncing(true)
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update settings')
      }

      // Mark as synced
      settingsStorage.markSynced(newSettings)
      setSyncStatus('synced')
      setError(null)
      
      return { success: true }

    } catch (error) {
      console.error('Error updating settings:', error)
      const errorMessage = error instanceof Error ? error.message : 'Update failed'
      
      // Revert on error
      const previous = settingsStorage.getLocal()
      const fallbackSettings = previous?.value || DEFAULT_SETTINGS
      
      setSettings(fallbackSettings)
      settingsStorage.markError(errorMessage)
      setSyncStatus('error')
      setError(errorMessage)
      
      return { success: false, error: errorMessage }
    } finally {
      setIsSyncing(false)
    }
  }, [settings, isAuthenticated])

  // Force sync
  const forceSync = useCallback(async () => {
    await syncWithDatabase(true)
  }, [syncWithDatabase])

  // Initialize on mount
  useEffect(() => {
    const local = settingsStorage.getLocal()
    if (local) {
      setSettings(local.value)
      setSyncStatus(local.syncStatus)
      
      if (local.syncStatus === 'synced' && !settingsStorage.needsSync()) {
        setIsLoading(false)
        supabase.auth.getUser().then(({ data: { user } }) => {
          setIsAuthenticated(!!user)
        })
        return
      }
    }

    syncWithDatabase()
  }, [syncWithDatabase, supabase.auth])

  // Handle storage events
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'userSettings' && event.newValue) {
        settingsStorage.handleStorageEvent(event)
      }
    }

    const unsubscribe = settingsStorage.subscribe((syncedValue) => {
      setSettings(syncedValue.value)
      setSyncStatus(syncedValue.syncStatus)
    })

    window.addEventListener('storage', handleStorageChange)

    return () => {
      unsubscribe()
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Periodic background sync
  useEffect(() => {
    if (!isAuthenticated) return

    let syncInterval: NodeJS.Timeout

    const startBackgroundSync = () => {
      syncInterval = setInterval(() => {
        if (document.visibilityState === 'visible' && settingsStorage.needsSync()) {
          syncWithDatabase()
        }
      }, 5 * 60 * 1000)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && settingsStorage.needsSync()) {
        syncWithDatabase()
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
    settings,
    updateSetting,
    updateSettings,
    isLoading,
    isSyncing,
    syncStatus,
    error,
    refetch: syncWithDatabase,
    forceSync
  }
}