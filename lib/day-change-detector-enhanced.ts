import { useEffect, useRef, useCallback } from 'react'

/**
 * Enhanced day change detection hook with better reliability
 * @param dayStartTime - The start time of the day (HH:mm format)
 * @param onDayChange - Callback to execute when day changes
 */
export function useDayChangeDetection(
  dayStartTime: string,
  onDayChange: () => void | Promise<void>
) {
  const lastCheckedDateRef = useRef<string>('')
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null)
  const hasTriggeredTodayRef = useRef(false)
  const isProcessingRef = useRef(false)

  // Get current date considering dayStartTime
  const getCurrentDate = useCallback(() => {
    const now = new Date()
    const [hours, minutes] = dayStartTime.split(':').map(Number)
    const dayStart = new Date(now)
    dayStart.setHours(hours, minutes, 0, 0)

    // If current time is before day start, consider it as previous day
    if (now < dayStart) {
      now.setDate(now.getDate() - 1)
    }

    return now.toDateString()
  }, [dayStartTime])

  // Check for day change with error handling
  const checkDayChange = useCallback(async () => {
    if (isProcessingRef.current) {
      console.log('[DayChange] Already processing, skipping check')
      return
    }

    try {
      const currentDate = getCurrentDate()
      
      // Reset the trigger flag if it's a new day
      if (lastCheckedDateRef.current !== currentDate) {
        hasTriggeredTodayRef.current = false
      }
      
      // Check if day has changed and we haven't triggered yet
      if (lastCheckedDateRef.current && 
          lastCheckedDateRef.current !== currentDate && 
          !hasTriggeredTodayRef.current) {
        
        console.log('[DayChange] Day change detected:', {
          from: lastCheckedDateRef.current,
          to: currentDate,
          time: new Date().toISOString()
        })
        
        isProcessingRef.current = true
        hasTriggeredTodayRef.current = true
        
        // Execute the callback (might be async)
        try {
          await onDayChange()
          console.log('[DayChange] Day change handler completed successfully')
        } catch (error) {
          console.error('[DayChange] Error in day change handler:', error)
          // Reset the flag so it can retry
          hasTriggeredTodayRef.current = false
        } finally {
          isProcessingRef.current = false
        }
      }
      
      lastCheckedDateRef.current = currentDate
    } catch (error) {
      console.error('[DayChange] Error in checkDayChange:', error)
    }
  }, [getCurrentDate, onDayChange])

  // Calculate milliseconds until next day boundary
  const getTimeUntilDayChange = useCallback(() => {
    const now = new Date()
    const [hours, minutes] = dayStartTime.split(':').map(Number)
    const nextDayStart = new Date(now)
    nextDayStart.setHours(hours, minutes, 0, 0)
    
    // If we've already passed today's start time, calculate for tomorrow
    if (now >= nextDayStart) {
      nextDayStart.setDate(nextDayStart.getDate() + 1)
    }
    
    const msUntilChange = nextDayStart.getTime() - now.getTime()
    console.log('[DayChange] Time until next day change:', {
      now: now.toISOString(),
      nextChange: nextDayStart.toISOString(),
      minutesUntil: Math.floor(msUntilChange / 60000)
    })
    
    return msUntilChange
  }, [dayStartTime])

  useEffect(() => {
    console.log('[DayChange] Initializing day change detection', {
      dayStartTime,
      currentDate: getCurrentDate()
    })

    // Set initial date
    lastCheckedDateRef.current = getCurrentDate()
    
    // Check immediately on mount (in case we're loading after a day change)
    checkDayChange()

    // Set up regular interval check (every 30 seconds for reliability)
    intervalIdRef.current = setInterval(() => {
      console.log('[DayChange] Interval check triggered')
      checkDayChange()
    }, 30 * 1000)

    // Schedule precise check at day boundary
    let dayBoundaryTimeout: NodeJS.Timeout
    
    const scheduleNextDayCheck = () => {
      const timeUntilChange = getTimeUntilDayChange()
      
      // Clear any existing timeout
      if (dayBoundaryTimeout) {
        clearTimeout(dayBoundaryTimeout)
      }
      
      // Schedule check 1 second after the day boundary
      dayBoundaryTimeout = setTimeout(() => {
        console.log('[DayChange] Day boundary reached, checking...')
        checkDayChange().then(() => {
          // Schedule the next day's check
          scheduleNextDayCheck()
        })
      }, timeUntilChange + 1000)
    }
    
    scheduleNextDayCheck()

    // Event listeners for when user returns to the page
    const handleFocus = () => {
      console.log('[DayChange] Window focused, checking for day change')
      checkDayChange()
    }
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[DayChange] Page became visible, checking for day change')
        checkDayChange()
      }
    }

    // Additional check when user interacts with the page
    const handleUserActivity = () => {
      // Debounce to avoid too many checks
      const now = Date.now()
      const lastActivity = (window as any).__lastDayCheckActivity || 0
      
      if (now - lastActivity > 60000) { // At least 1 minute between activity checks
        (window as any).__lastDayCheckActivity = now
        checkDayChange()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('click', handleUserActivity)
    window.addEventListener('keydown', handleUserActivity)

    // Cleanup
    return () => {
      console.log('[DayChange] Cleaning up day change detection')
      
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current)
      }
      
      if (dayBoundaryTimeout) {
        clearTimeout(dayBoundaryTimeout)
      }
      
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('click', handleUserActivity)
      window.removeEventListener('keydown', handleUserActivity)
    }
  }, [dayStartTime, getCurrentDate, checkDayChange, getTimeUntilDayChange])

  // Return debug info for troubleshooting
  return {
    currentDate: lastCheckedDateRef.current,
    hasTriggeredToday: hasTriggeredTodayRef.current,
    isProcessing: isProcessingRef.current
  }
}