# Sync Implementation Guide

## Overview

This document describes the robust synchronization mechanism implemented for syncing settings between localStorage and the database.

## Key Features

1. **Versioned Storage**: Each stored value includes version information to detect schema changes
2. **Timestamp Tracking**: Tracks when data was last synced to detect stale data
3. **Sync Status**: Clear indication of sync state (synced, pending, error, stale)
4. **Conflict Resolution**: Handles conflicts between local and remote data
5. **Offline Support**: Works offline with pending sync status
6. **Cross-tab Sync**: Automatically syncs changes across browser tabs
7. **Background Sync**: Periodic sync when tab is visible
8. **Retry Logic**: Exponential backoff for failed syncs

## Implementation

### 1. SyncedStorage Utility (`/lib/utils/syncedStorage.ts`)

The core utility that manages versioned storage with metadata:

```typescript
interface SyncedValue<T> {
  value: T
  version: number
  lastSynced: string // ISO timestamp
  syncStatus: 'synced' | 'pending' | 'error' | 'stale'
  lastError?: string
}
```

### 2. Updated Hook (`/lib/hooks/useDayStartTimeV2.ts`)

The new hook implementation with enhanced features:

- Always validates localStorage against DB on initial load
- Implements proper error handling and retry logic
- Provides sync status to UI components
- Handles offline scenarios gracefully

### 3. Migration Utility (`/lib/utils/migrateDayStartTime.ts`)

Handles migration from old format to new versioned format:

```typescript
// Old format: "15:30"
// New format: { value: "15:30", version: 2, lastSynced: "...", syncStatus: "synced" }
```

### 4. UI Components (`/components/ui/SyncStatusIndicator.tsx`)

Visual indicators for sync status:
- Cloud icon when synced
- Loading spinner when syncing
- Warning icon for errors
- Offline icon for pending syncs

## Usage

### Basic Usage

```typescript
import { useDayStartTimeV2 } from '@/lib/hooks/useDayStartTimeV2'

function MyComponent() {
  const {
    dayStartTime,
    updateDayStartTime,
    isLoading,
    isSyncing,
    syncStatus,
    error
  } = useDayStartTimeV2()

  return (
    <div>
      <input 
        value={dayStartTime}
        onChange={(e) => updateDayStartTime(e.target.value)}
      />
      <SyncStatusIndicator 
        syncStatus={syncStatus}
        isSyncing={isSyncing}
        error={error}
      />
    </div>
  )
}
```

### Applying to Other Settings

The pattern can be reused for any setting. See `/lib/hooks/useUserSettings.ts` for a comprehensive example that manages multiple settings.

## Migration Path

1. Deploy new code with backward compatibility
2. Users will automatically migrate on first load
3. Old format is detected and converted
4. Force sync ensures database is updated

## Best Practices

1. **Always validate data**: Use validators to ensure data integrity
2. **Handle errors gracefully**: Provide fallbacks and clear error messages
3. **Optimize for performance**: Use stale-while-revalidate pattern
4. **Consider offline users**: Make sure app works without network
5. **Test edge cases**: Multiple tabs, network failures, concurrent updates

## Troubleshooting

### Common Issues

1. **Sync stuck in pending**: Check network connectivity and authentication
2. **Version mismatch**: Increment version when changing data structure
3. **Stale data**: Adjust `maxStaleTime` based on your needs
4. **Conflict resolution**: Implement appropriate strategy for your use case

### Debug Mode

Enable debug logging by setting:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[Sync]', { status, value, error })
}
```