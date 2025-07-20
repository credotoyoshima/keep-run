import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDateForDayStart } from '@/lib/date-utils'

// 習慣の達成記録を追加/更新
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const habitId = params.id
    const body = await request.json()
    const { completed, dayStartTime } = body

    // ユーザーが所有する習慣か確認
    const habit = await prisma.continuousHabit.findFirst({
      where: {
        id: habitId,
        userId: user.id
      }
    })

    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
    }

    // 一日の始まり時間を考慮して正しい日付を取得
    const recordDate = getDateForDayStart(new Date(), dayStartTime || '05:00')

    // デバッグログ：受け取ったパラメータを確認
    console.log('[DEBUG] Recording habit:', {
      habitId,
      completed,
      dayStartTime,
      recordDate: recordDate.toISOString(),
      userId: user.id
    })

    // 既存の記録を確認
    const existingRecord = await prisma.habitRecord.findFirst({
      where: {
        habitId,
        date: recordDate
      }
    })

    console.log('[DEBUG] Existing record:', existingRecord)

    if (existingRecord) {
      // 既存の記録を更新
      const updatedRecord = await prisma.habitRecord.update({
        where: { id: existingRecord.id },
        data: { completed }
      })
      console.log('[DEBUG] Updated record:', updatedRecord)
      return NextResponse.json(updatedRecord)
    } else {
      // 新しい記録を作成
      const newRecord = await prisma.habitRecord.create({
        data: {
          habitId,
          date: recordDate,
          completed
        }
      })
      console.log('[DEBUG] Created new record:', newRecord)
      
      // 作成されたレコードを再取得して確認
      const verifyRecord = await prisma.habitRecord.findUnique({
        where: { id: newRecord.id },
        include: { habit: true }
      })
      console.log('[DEBUG] Verified record:', verifyRecord)
      
      return NextResponse.json(newRecord)
    }
  } catch (error) {
    console.error('Error recording habit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}