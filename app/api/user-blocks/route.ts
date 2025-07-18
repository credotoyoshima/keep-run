import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getUserDayStartTime } from '@/lib/server-utils'

// ユーザーの時間ブロックを取得（日付に依存しない）
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // URLパラメータからページ番号を取得
    const { searchParams } = new URL(request.url)
    const pageNumber = parseInt(searchParams.get('page') || '1')
    
    // ユーザーの一日の始まり時間を取得
    const dayStartTime = await getUserDayStartTime(user.id)

    // ユーザーに紐づく指定ページの時間ブロックを取得
    const timeBlocks = await prisma.$queryRaw`
      SELECT 
        atb.id,
        atb.title,
        atb."startTime",
        atb."orderIndex",
        atb."pageNumber",
        atb."completionRate",
        atb."createdAt",
        atb."updatedAt",
        json_agg(
          json_build_object(
            'id', at.id,
            'title', at.title,
            'completed', at.completed,
            'orderIndex', at."orderIndex"
          ) ORDER BY at."orderIndex"
        ) FILTER (WHERE at.id IS NOT NULL) as tasks
      FROM "ActiveTimeBlock" atb
      INNER JOIN "ActiveDay" ad ON atb."dayId" = ad.id
      LEFT JOIN "ActiveTask" at ON at."blockId" = atb.id
      WHERE ad."userId" = ${user.id} AND atb."pageNumber" = ${pageNumber}
      GROUP BY atb.id, atb.title, atb."startTime", atb."orderIndex", atb."pageNumber", atb."completionRate", atb."createdAt", atb."updatedAt"
      ORDER BY atb."startTime"
    `

    // PostgreSQLのjson_aggはnullを含む可能性があるため、配列として整形
    const formattedBlocks = (timeBlocks || []).map((block: any) => ({
      ...block,
      tasks: block.tasks || []
    }))
    
    // dayStartTimeを考慮して並び替え
    const sortedBlocks = formattedBlocks.sort((a, b) => {
      const aTime = a.startTime
      const bTime = b.startTime
      
      // dayStartTime以降の時間かどうかを判定
      const aIsAfterDayStart = aTime >= dayStartTime
      const bIsAfterDayStart = bTime >= dayStartTime
      
      // 両方がdayStartTime以降または両方が以前の場合は時間順
      if (aIsAfterDayStart === bIsAfterDayStart) {
        return aTime.localeCompare(bTime)
      }
      
      // dayStartTime以降の時間を先に表示
      return aIsAfterDayStart ? -1 : 1
    })
    
    return NextResponse.json(sortedBlocks)
  } catch (error) {
    console.error('Error fetching user blocks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 新しい時間ブロックを作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, startTime, pageNumber = 1 } = body

    // ユーザーの永続的なActiveDayを取得または作成
    let activeDay = await prisma.activeDay.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' }
    })

    if (!activeDay) {
      activeDay = await prisma.activeDay.create({
        data: {
          userId: user.id,
          date: new Date()
        }
      })
    }

    // 指定ページの最後の順序を取得
    const lastBlock = await prisma.activeTimeBlock.findFirst({
      where: { 
        dayId: activeDay.id,
        pageNumber: pageNumber
      },
      orderBy: { orderIndex: 'desc' }
    })

    // 新しい時間ブロックを作成
    const newBlock = await prisma.activeTimeBlock.create({
      data: {
        title,
        startTime,
        orderIndex: (lastBlock?.orderIndex ?? -1) + 1,
        pageNumber,
        dayId: activeDay.id,
        completionRate: 0
      }
    })

    return NextResponse.json({
      ...newBlock,
      tasks: []
    })
  } catch (error) {
    console.error('Error creating time block:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 時間ブロックを削除
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const blockId = searchParams.get('blockId')

    if (!blockId) {
      return NextResponse.json({ error: 'Block ID is required' }, { status: 400 })
    }

    // ユーザーが所有するブロックか確認
    const block = await prisma.activeTimeBlock.findFirst({
      where: {
        id: blockId,
        day: {
          userId: user.id
        }
      }
    })

    if (!block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 })
    }

    // 関連するタスクを論理削除
    await prisma.activeTask.updateMany({
      where: { 
        blockId,
        archived: false 
      },
      data: { archived: true }
    })

    // ブロックを論理削除
    await prisma.activeTimeBlock.update({
      where: { id: blockId },
      data: { archived: true }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting time block:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}