import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getUserDayStartTime } from '@/lib/server-utils'
import { getDateForDayStart } from '@/lib/date-utils'

// 日付変更時にタスクをリセット
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーの一日の始まり時間を取得
    const dayStartTime = await getUserDayStartTime(user.id)
    
    // 現在の日付（一日の始まりの時間を考慮）
    const currentDate = getDateForDayStart(new Date(), dayStartTime)
    const currentDateStr = currentDate.toISOString().split('T')[0]
    
    // ユーザーのアクティブデイを取得または作成
    const activeDay = await prisma.activeDay.findFirst({
      where: {
        userId: user.id,
        date: currentDate
      }
    })

    if (!activeDay) {
      // 今日のアクティブデイがまだない場合は、リセット不要
      return NextResponse.json({ message: 'No active day found for today' })
    }

    // 今日より前の日付のタスクをリセット
    const resetResult = await prisma.activeTask.updateMany({
      where: {
        block: {
          day: {
            userId: user.id,
            date: {
              lt: currentDate
            }
          }
        },
        completed: true,
        archived: false
      },
      data: {
        completed: false
      }
    })

    // 今日の全タスクの完了状態をリセット（オプション）
    // これは、日付が変わった瞬間に今日のタスクもリセットしたい場合
    const todayResetResult = await prisma.activeTask.updateMany({
      where: {
        block: {
          dayId: activeDay.id
        },
        completed: true,
        archived: false
      },
      data: {
        completed: false
      }
    })

    // 時間ブロックの完了率もリセット
    await prisma.activeTimeBlock.updateMany({
      where: {
        dayId: activeDay.id
      },
      data: {
        completionRate: 0
      }
    })

    return NextResponse.json({
      message: 'Tasks reset successfully',
      resetCount: resetResult.count + todayResetResult.count,
      date: currentDateStr
    })
  } catch (error) {
    console.error('Error resetting tasks:', error)
    return NextResponse.json(
      { error: 'Failed to reset tasks' },
      { status: 500 }
    )
  }
}