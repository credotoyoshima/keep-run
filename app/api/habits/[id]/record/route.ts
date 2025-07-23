import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDateForDayStart } from '@/lib/date-utils'
import { DAILY_MOTIVATION_MESSAGES } from '@/lib/constants/motivationMessages'

// 習慣の達成記録を追加/更新
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('[DEBUG API] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const habitId = params.id
    const body = await request.json()
    const { completed, dayStartTime } = body

    console.log('[DEBUG API] POST /api/habits/[id]/record - Request received:', {
      habitId,
      completed,
      dayStartTime,
      userId: user.id,
      userEmail: user.email
    })

    // ユーザーが所有する習慣か確認
    const habit = await prisma.continuousHabit.findFirst({
      where: {
        id: habitId,
        userId: user.id
      }
    })

    if (!habit) {
      console.log('[DEBUG API] Habit not found:', { habitId, userId: user.id })
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
    }

    console.log('[DEBUG API] Found habit:', {
      habitId: habit.id,
      title: habit.title,
      isActive: habit.isActive
    })

    // 一日の始まり時間を考慮して正しい日付を取得
    const recordDate = getDateForDayStart(new Date(), dayStartTime || '05:00')

    console.log('[DEBUG API] Date calculation:', {
      now: new Date().toISOString(),
      dayStartTime: dayStartTime || '05:00',
      recordDate: recordDate.toISOString(),
      recordDateString: recordDate.toISOString().split('T')[0]
    })

    // 既存の記録を確認
    const existingRecord = await prisma.habitRecord.findFirst({
      where: {
        habitId,
        date: recordDate
      }
    })

    console.log('[DEBUG API] Existing record check:', {
      habitId,
      searchDate: recordDate.toISOString(),
      existingRecord: existingRecord ? {
        id: existingRecord.id,
        date: existingRecord.date.toISOString(),
        completed: existingRecord.completed
      } : null
    })

    let result
    if (existingRecord) {
      // 既存の記録を更新
      result = await prisma.habitRecord.update({
        where: { id: existingRecord.id },
        data: { completed }
      })
      console.log('[DEBUG API] Updated existing record:', {
        id: result.id,
        date: result.date.toISOString(),
        completed: result.completed
      })
    } else {
      // 新しい記録を作成
      result = await prisma.habitRecord.create({
        data: {
          habitId,
          date: recordDate,
          completed
        }
      })
      console.log('[DEBUG API] Created new record:', {
        id: result.id,
        date: result.date.toISOString(),
        completed: result.completed
      })
    }

    // 作成/更新後の検証
    const verifyRecord = await prisma.habitRecord.findUnique({
      where: { id: result.id }
    })
    console.log('[DEBUG API] Verification - record exists:', verifyRecord ? 'YES' : 'NO')

    // 全記録を確認（デバッグ用）
    const allRecords = await prisma.habitRecord.findMany({
      where: { habitId },
      orderBy: { date: 'desc' },
      take: 5
    })
    console.log('[DEBUG API] Recent records for habit:', allRecords.map(r => ({
      date: r.date.toISOString().split('T')[0],
      completed: r.completed
    })))

    // 習慣の現在の日数を計算して適切なメッセージを返す
    // 日本時間（JST）での日付文字列を取得
    const jstOptions = { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' } as const
    const recordDateJST = new Date(recordDate.toLocaleDateString('en-CA', jstOptions))
    const startDateJST = new Date(habit.startDate.toLocaleDateString('en-CA', jstOptions))
    
    // 日数差を計算（開始日を1日目として計算）
    const daysDiff = Math.floor((recordDateJST.getTime() - startDateJST.getTime()) / (24 * 60 * 60 * 1000))
    const currentDay = Math.max(1, daysDiff + 1)
    
    console.log('[DEBUG API] Day calculation (JST):', {
      recordDate: recordDate.toISOString(),
      habitStartDate: habit.startDate.toISOString(),
      recordDateJST: recordDateJST.toISOString(),
      startDateJST: startDateJST.toISOString(),
      daysDiff,
      currentDay,
      messageIndex: currentDay - 1,
      message: currentDay <= 14 ? DAILY_MOTIVATION_MESSAGES[currentDay - 1] : null
    })
    
    const motivationMessage = completed && currentDay <= 14 ? DAILY_MOTIVATION_MESSAGES[currentDay - 1] : null

    return NextResponse.json({
      ...result,
      motivationMessage,
      currentDay
    })
  } catch (error) {
    console.error('[DEBUG API] Error in record route:', error)
    console.error('[DEBUG API] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}