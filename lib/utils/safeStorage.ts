/**
 * Safe storage wrapper that provides fallbacks when localStorage is unavailable
 * Tries localStorage -> sessionStorage -> in-memory storage
 */

interface FallbackStorage {
  [key: string]: string
}

// Initialize fallback storage on window object
declare global {
  interface Window {
    __fallbackStorage?: FallbackStorage
    __storageAvailable?: boolean
  }
}

// Test if storage is available
function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = window[type]
    const testKey = '__storage_test__'
    storage.setItem(testKey, 'test')
    storage.removeItem(testKey)
    return true
  } catch (e) {
    return false
  }
}

// Initialize storage availability check
if (typeof window !== 'undefined' && window.__storageAvailable === undefined) {
  window.__storageAvailable = isStorageAvailable('localStorage')
  console.log('[SafeStorage] localStorage available:', window.__storageAvailable)
}

export const safeStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null

    try {
      // Try localStorage first
      if (window.__storageAvailable && localStorage.getItem(key) !== null) {
        return localStorage.getItem(key)
      }
    } catch (error) {
      console.warn('[SafeStorage] localStorage read failed:', error)
    }

    try {
      // Fallback to sessionStorage
      const sessionValue = sessionStorage.getItem(key)
      if (sessionValue !== null) {
        console.log('[SafeStorage] Using sessionStorage fallback for:', key)
        return sessionValue
      }
    } catch (error) {
      console.warn('[SafeStorage] sessionStorage read failed:', error)
    }

    // Final fallback to in-memory storage
    if (window.__fallbackStorage && window.__fallbackStorage[key]) {
      console.log('[SafeStorage] Using in-memory fallback for:', key)
      return window.__fallbackStorage[key]
    }

    return null
  },

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return

    // Initialize fallback storage if needed
    if (!window.__fallbackStorage) {
      window.__fallbackStorage = {}
    }

    let localStorageSuccess = false
    let sessionStorageSuccess = false

    // Try localStorage
    try {
      if (window.__storageAvailable) {
        localStorage.setItem(key, value)
        localStorageSuccess = true
      }
    } catch (error) {
      console.warn('[SafeStorage] localStorage write failed:', error)
      // Check if it's a quota exceeded error
      if (error instanceof DOMException && error.code === 22) {
        console.error('[SafeStorage] localStorage quota exceeded')
        // Try to clear some space by removing old data
        try {
          this.clearOldData()
          localStorage.setItem(key, value)
          localStorageSuccess = true
        } catch (retryError) {
          console.error('[SafeStorage] Failed to write after clearing space:', retryError)
        }
      }
    }

    // Try sessionStorage
    try {
      sessionStorage.setItem(key, value)
      sessionStorageSuccess = true
    } catch (error) {
      console.warn('[SafeStorage] sessionStorage write failed:', error)
    }

    // Always save to in-memory as final fallback
    window.__fallbackStorage[key] = value

    // Log storage method used
    if (localStorageSuccess) {
      console.log('[SafeStorage] Saved to localStorage:', key)
    } else if (sessionStorageSuccess) {
      console.log('[SafeStorage] Saved to sessionStorage only:', key)
    } else {
      console.log('[SafeStorage] Saved to in-memory only:', key)
    }
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('[SafeStorage] localStorage remove failed:', error)
    }

    try {
      sessionStorage.removeItem(key)
    } catch (error) {
      console.warn('[SafeStorage] sessionStorage remove failed:', error)
    }

    if (window.__fallbackStorage) {
      delete window.__fallbackStorage[key]
    }
  },

  // Clear old or unnecessary data to free up space
  clearOldData(): void {
    try {
      const keysToKeep = new Set([
        'selectedDayPage',
        'expandedTimeBlocks',
        'dayStartTime',
        'sb-pzwxrocchxqmdqeduwjy-auth-token' // Supabase auth token
      ])

      // Remove keys that are not in the keep list
      const allKeys = Object.keys(localStorage)
      for (const key of allKeys) {
        if (!keysToKeep.has(key) && !key.startsWith('sb-')) {
          localStorage.removeItem(key)
          console.log('[SafeStorage] Removed old key:', key)
        }
      }
    } catch (error) {
      console.error('[SafeStorage] Error clearing old data:', error)
    }
  },

  // Get storage info for debugging
  getStorageInfo(): { localStorage: boolean; sessionStorage: boolean; fallbackKeys: string[] } {
    return {
      localStorage: window.__storageAvailable || false,
      sessionStorage: isStorageAvailable('sessionStorage'),
      fallbackKeys: window.__fallbackStorage ? Object.keys(window.__fallbackStorage) : []
    }
  }
}

// Export individual functions for backward compatibility
export const getStorageItem = safeStorage.getItem
export const setStorageItem = safeStorage.setItem
export const removeStorageItem = safeStorage.removeItem