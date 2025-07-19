import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーの時間ブロックを取得（ActiveDayに依存しない）
    const timeBlocks = await prisma.activeTimeBlock.findMany({
      where: {
        day: {
          userId: user.id
        }
      },
      include: {
        tasks: {
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { orderIndex: 'asc' }
    })

    // 今日の日付を取得（完了状態のリセット用）
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // タスクの完了状態を今日の日付でリセット（必要に応じて）
    // ここでは、完了状態の管理方法を後で実装します

    return NextResponse.json({ timeBlocks })
  } catch (error) {
    console.error('Error fetching time blocks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, startTime } = body

    // 最初のActiveDayを作成または取得（互換性のため）
    let activeDay = await prisma.activeDay.findFirst({
      where: { userId: user.id }
    })

    if (!activeDay) {
      activeDay = await prisma.activeDay.create({
        data: {
          userId: user.id,
          date: new Date()
        }
      })
    }

    // 最後の順序を取得
    const lastBlock = await prisma.activeTimeBlock.findFirst({
      where: { dayId: activeDay.id },
      orderBy: { orderIndex: 'desc' }
    })

    const newBlock = await prisma.activeTimeBlock.create({
      data: {
        title,
        startTime,
        orderIndex: (lastBlock?.orderIndex ?? -1) + 1,
        dayId: activeDay.id
      },
      include: {
        tasks: true
      }
    })

    return NextResponse.json(newBlock)
  } catch (error) {
    console.error('Error creating time block:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}