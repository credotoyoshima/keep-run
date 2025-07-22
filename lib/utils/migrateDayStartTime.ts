/**
 * Migration utility for dayStartTime storage
 * Migrates from old localStorage format to new versioned format
 */

import { createSyncedStorage } from './syncedStorage'

const DEFAULT_DAY_START_TIME = '05:00'
const OLD_KEY = 'dayStartTime'
const NEW_KEY = 'dayStartTime' // Same key, but with new format

// Time format validator
const isValidTimeFormat = (value: unknown): value is string => {
  return typeof value === 'string' && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)
}

export interface MigrationResult {
  migrated: boolean
  oldValue?: string
  newValue: string
  error?: string
}

/**
 * Migrate dayStartTime from old format to new versioned format
 */
export async function migrateDayStartTime(): Promise<MigrationResult> {
  if (typeof window === 'undefined') {
    return {
      migrated: false,
      newValue: DEFAULT_DAY_START_TIME,
      error: 'Not in browser environment'
    }
  }

  try {
    // Check if we have an old format value
    const oldValue = localStorage.getItem(OLD_KEY)
    
    // If no old value, nothing to migrate
    if (!oldValue) {
      return {
        migrated: false,
        newValue: DEFAULT_DAY_START_TIME
      }
    }

    // Try to parse as JSON first (might already be new format)
    try {
      const parsed = JSON.parse(oldValue)
      if (parsed && typeof parsed === 'object' && 'version' in parsed) {
        // Already in new format
        return {
          migrated: false,
          newValue: parsed.value || DEFAULT_DAY_START_TIME
        }
      }
    } catch {
      // Not JSON, continue with migration
    }

    // Validate the old value
    if (!isValidTimeFormat(oldValue)) {
      console.warn('Invalid time format in localStorage:', oldValue)
      return {
        migrated: false,
        oldValue,
        newValue: DEFAULT_DAY_START_TIME,
        error: 'Invalid time format'
      }
    }

    // Create synced storage instance
    const storage = createSyncedStorage({
      key: NEW_KEY,
      defaultValue: DEFAULT_DAY_START_TIME,
      version: 2,
      validator: isValidTimeFormat
    })

    // Migrate to new format
    storage.setLocal(oldValue, 'stale') // Mark as stale to force DB sync

    console.log('Successfully migrated dayStartTime to new format')
    
    return {
      migrated: true,
      oldValue,
      newValue: oldValue
    }

  } catch (error) {
    console.error('Error during dayStartTime migration:', error)
    return {
      migrated: false,
      newValue: DEFAULT_DAY_START_TIME,
      error: error instanceof Error ? error.message : 'Migration failed'
    }
  }
}

/**
 * Check if migration is needed
 */
export function needsMigration(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const stored = localStorage.getItem(OLD_KEY)
    if (!stored) return false

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(stored)
      // If it has a version field, it's already migrated
      return !(parsed && typeof parsed === 'object' && 'version' in parsed)
    } catch {
      // Not JSON, needs migration
      return true
    }
  } catch {
    return false
  }
}