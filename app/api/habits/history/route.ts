import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// 習慣履歴を取得
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 達成した習慣のみを取得
    const history = await prisma.habitHistory.findMany({
      where: {
        userId: user.id,
        status: 'completed'
      },
      orderBy: {
        endDate: 'desc'
      }
    })

    // 日付をフォーマット
    const formattedHistory = history.map(h => ({
      id: h.id,
      title: h.title,
      startDate: h.startDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '/'),
      endDate: h.endDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '/'),
      completedDays: h.completedDays
    }))

    return NextResponse.json(formattedHistory)
  } catch (error) {
    console.error('Error fetching habit history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}