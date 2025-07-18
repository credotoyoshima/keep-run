import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// 習慣を完了としてマーク
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

    // ユーザーが所有する習慣か確認
    const habit = await prisma.continuousHabit.findFirst({
      where: {
        id: habitId,
        userId: user.id,
        isActive: true
      },
      include: {
        records: true
      }
    })

    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
    }

    // 完了日数を確認
    const completedDays = habit.records.filter(r => r.completed).length
    if (completedDays < 14) {
      return NextResponse.json({ error: 'Habit not completed yet' }, { status: 400 })
    }

    // 習慣を履歴に移動
    await prisma.habitHistory.create({
      data: {
        title: habit.title,
        category: habit.category,
        startDate: habit.startDate,
        endDate: new Date(),
        totalDays: habit.targetDays,
        completedDays: completedDays,
        status: 'completed',
        userId: user.id
      }
    })

    // 習慣を非アクティブにする
    await prisma.continuousHabit.update({
      where: { id: habit.id },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error completing habit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}