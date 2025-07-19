import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// 手動で今日のタスクをリセット（開発・テスト用）
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーの今日のアクティブデイを取得
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const activeDay = await prisma.activeDay.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    })

    if (!activeDay) {
      return NextResponse.json({ 
        message: 'No active day found for today',
        date: today.toISOString() 
      })
    }

    // 今日の全タスクの完了状態をリセット
    const resetResult = await prisma.activeTask.updateMany({
      where: {
        block: {
          dayId: activeDay.id
        },
        completed: true
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
      message: 'Today\'s tasks reset successfully',
      resetCount: resetResult.count,
      date: today.toISOString()
    })
  } catch (error) {
    console.error('Error triggering task reset:', error)
    return NextResponse.json(
      { error: 'Failed to reset tasks' },
      { status: 500 }
    )
  }
}