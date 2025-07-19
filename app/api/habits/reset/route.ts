import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// 習慣をリセット
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // アクティブな習慣を取得
    const activeHabit = await prisma.continuousHabit.findFirst({
      where: {
        userId: user.id,
        isActive: true
      }
    })

    if (!activeHabit) {
      return NextResponse.json({ error: 'アクティブな習慣が見つかりません' }, { status: 404 })
    }

    // 完了日数を先にカウント
    const completedDays = await prisma.habitRecord.count({
      where: {
        habitId: activeHabit.id,
        completed: true
      }
    })

    // トランザクションで処理
    await prisma.$transaction(async (tx) => {
      // 習慣履歴に記録を作成（リセットとして）
      await tx.habitHistory.create({
        data: {
          title: activeHabit.title,
          category: activeHabit.category,
          startDate: activeHabit.startDate,
          endDate: new Date(),
          totalDays: Math.floor((new Date().getTime() - activeHabit.startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1,
          completedDays: completedDays,
          status: 'abandoned', // リセットされた習慣
          userId: user.id
        }
      })

      // 習慣の記録を削除
      await tx.habitRecord.deleteMany({
        where: { habitId: activeHabit.id }
      })

      // 習慣を非アクティブにする
      await tx.continuousHabit.update({
        where: { id: activeHabit.id },
        data: { isActive: false }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resetting habit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}