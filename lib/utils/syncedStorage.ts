/**
 * Synced Storage Utility
 * 
 * Provides a robust mechanism for synchronizing settings between localStorage and database
 * with versioning, timestamp tracking, and conflict resolution.
 */

export interface SyncedValue<T> {
  value: T
  version: number
  lastSynced: string // ISO timestamp
  syncStatus: 'synced' | 'pending' | 'error' | 'stale'
  lastError?: string
}

export interface SyncedStorageConfig<T> {
  key: string
  defaultValue: T
  version: number
  validator?: (value: unknown) => value is T
  maxStaleTime?: number // milliseconds, default 5 minutes
}

export class SyncedStorage<T> {
  private config: Required<SyncedStorageConfig<T>>
  private syncListeners: Set<(value: SyncedValue<T>) => void> = new Set()

  constructor(config: SyncedStorageConfig<T>) {
    this.config = {
      ...config,
      validator: config.validator || ((value: unknown): value is T => true),
      maxStaleTime: config.maxStaleTime || 5 * 60 * 1000 // 5 minutes
    }
  }

  /**
   * Get value from localStorage with metadata
   */
  getLocal(): SyncedValue<T> | null {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(this.config.key)
      if (!stored) return null

      const parsed = JSON.parse(stored) as SyncedValue<T>
      
      // Validate structure
      if (!this.isValidSyncedValue(parsed)) {
        return null
      }

      // Check if stale
      const age = Date.now() - new Date(parsed.lastSynced).getTime()
      if (age > this.config.maxStaleTime) {
        parsed.syncStatus = 'stale'
      }

      return parsed
    } catch {
      return null
    }
  }

  /**
   * Set value in localStorage with metadata
   */
  setLocal(value: T, status: SyncedValue<T>['syncStatus'] = 'pending'): void {
    if (typeof window === 'undefined') return

    const syncedValue: SyncedValue<T> = {
      value,
      version: this.config.version,
      lastSynced: new Date().toISOString(),
      syncStatus: status
    }

    localStorage.setItem(this.config.key, JSON.stringify(syncedValue))
    this.notifyListeners(syncedValue)

    // Dispatch storage event for cross-tab sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: this.config.key,
      newValue: JSON.stringify(syncedValue),
      url: window.location.href
    }))
  }

  /**
   * Remove value from localStorage
   */
  removeLocal(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.config.key)
  }

  /**
   * Mark local value as synced with updated timestamp
   */
  markSynced(value: T): void {
    this.setLocal(value, 'synced')
  }

  /**
   * Mark local value as having an error
   */
  markError(error: string): void {
    const current = this.getLocal()
    if (current) {
      const errorValue: SyncedValue<T> = {
        ...current,
        syncStatus: 'error',
        lastError: error
      }
      localStorage.setItem(this.config.key, JSON.stringify(errorValue))
      this.notifyListeners(errorValue)
    }
  }

  /**
   * Check if a database sync is needed
   */
  needsSync(): boolean {
    const local = this.getLocal()
    
    if (!local) return true // No local value, need to fetch from DB
    if (local.version < this.config.version) return true // Outdated version
    if (local.syncStatus === 'stale') return true // Too old
    if (local.syncStatus === 'error') return true // Previous error
    
    return false
  }

  /**
   * Get the current value or default
   */
  getValue(): T {
    const local = this.getLocal()
    return local?.value ?? this.config.defaultValue
  }

  /**
   * Subscribe to value changes
   */
  subscribe(listener: (value: SyncedValue<T>) => void): () => void {
    this.syncListeners.add(listener)
    
    // Return unsubscribe function
    return () => {
      this.syncListeners.delete(listener)
    }
  }

  /**
   * Handle storage events from other tabs
   */
  handleStorageEvent(event: StorageEvent): void {
    if (event.key !== this.config.key || !event.newValue) return

    try {
      const parsed = JSON.parse(event.newValue) as SyncedValue<T>
      if (this.isValidSyncedValue(parsed)) {
        this.notifyListeners(parsed)
      }
    } catch {
      // Invalid data, ignore
    }
  }

  private isValidSyncedValue(value: unknown): value is SyncedValue<T> {
    if (!value || typeof value !== 'object') return false
    
    const v = value as any
    return (
      'value' in v &&
      'version' in v &&
      'lastSynced' in v &&
      'syncStatus' in v &&
      this.config.validator(v.value)
    )
  }

  private notifyListeners(value: SyncedValue<T>): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(value)
      } catch (error) {
        console.error('Error in sync listener:', error)
      }
    })
  }
}

/**
 * Create a synced storage instance with a specific configuration
 */
export function createSyncedStorage<T>(config: SyncedStorageConfig<T>): SyncedStorage<T> {
  return new SyncedStorage(config)
}