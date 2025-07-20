import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// デバッグ用エンドポイント - 本番環境では削除してください
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーの習慣を取得
    const habits = await prisma.continuousHabit.findMany({
      where: { userId: user.id },
      include: {
        records: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    // habitIdがNULLのレコードを確認
    const nullHabitRecords = await prisma.habitRecord.findMany({
      where: { habitId: null },
      take: 10
    })

    // 統計情報
    const stats = await prisma.habitRecord.groupBy({
      by: ['habitId'],
      _count: {
        id: true
      }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      habits: habits.map(h => ({
        id: h.id,
        title: h.title,
        isActive: h.isActive,
        recordCount: h.records.length,
        records: h.records.map(r => ({
          id: r.id,
          habitId: r.habitId,
          date: r.date,
          completed: r.completed,
          createdAt: r.createdAt
        }))
      })),
      nullHabitRecords: nullHabitRecords.length,
      stats
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}