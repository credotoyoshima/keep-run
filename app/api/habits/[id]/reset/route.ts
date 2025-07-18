import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// 習慣をリセット（振り出しに戻す）
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const habitId = params.id

    // ユーザーが所有する習慣か確認
    const habit = await prisma.continuousHabit.findFirst({
      where: {
        id: habitId,
        userId: user.id,
        isActive: true
      }
    })

    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
    }

    // 習慣を履歴に移動
    await prisma.habitHistory.create({
      data: {
        title: habit.title,
        category: habit.category,
        startDate: habit.startDate,
        endDate: new Date(),
        totalDays: habit.targetDays,
        completedDays: await prisma.habitRecord.count({
          where: {
            habitId: habit.id,
            completed: true
          }
        }),
        status: 'failed',
        userId: user.id
      }
    })

    // 記録を削除
    await prisma.habitRecord.deleteMany({
      where: { habitId: habit.id }
    })

    // 習慣を非アクティブにする
    await prisma.continuousHabit.update({
      where: { id: habit.id },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resetting habit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}