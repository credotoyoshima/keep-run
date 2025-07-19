import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUserByEmail } from '@/lib/server-utils'

// ユーザーの時間ブロックを取得（日付に依存しない）
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || !user.email) {
      console.error('Authentication error:', authError || 'No user or email')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // URLパラメータからページ番号を取得
    const { searchParams } = new URL(request.url)
    const pageNumber = parseInt(searchParams.get('page') || '1')
    
    // 安全なPrismaクエリでデータを取得（500エラー解決）
    const user_data = await getOrCreateUserByEmail(user.email!)
    
    // アクティブな日を取得または作成
    let activeDay = await prisma.activeDay.findFirst({
      where: { userId: user_data.id }
    })
    
    if (!activeDay) {
      activeDay = await prisma.activeDay.create({
        data: {
          userId: user_data.id,
          date: new Date()
        }
      })
    }
    
    // 指定ページの時間ブロックを取得
    const timeBlocks = await prisma.activeTimeBlock.findMany({
      where: {
        dayId: activeDay.id,
        pageNumber: pageNumber,
        archived: false
      },
      include: {
        tasks: {
          where: { archived: false },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { orderIndex: 'asc' }
    })
    
    // 型安全なデータ変換
    const formattedBlocks = timeBlocks.map(block => ({
      id: block.id,
      title: block.title,
      startTime: block.startTime,
      orderIndex: block.orderIndex,
      pageNumber: block.pageNumber,
      completionRate: block.completionRate,
      archived: block.archived,
      tasks: block.tasks.map(task => ({
        id: task.id,
        title: task.title,
        completed: task.completed,
        orderIndex: task.orderIndex,
        archived: task.archived
      }))
    }))
    
    return NextResponse.json(formattedBlocks)
  } catch (error) {
    console.error('Error fetching user blocks:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// 新しい時間ブロックを作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || !user.email) {
      console.error('Authentication error:', authError || 'No user or email')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, startTime, pageNumber = 1 } = body

    // Prismaのユーザーを取得または作成
    const prismaUser = await getOrCreateUserByEmail(user.email!)

    // ユーザーの永続的なActiveDayを取得または作成
    let activeDay = await prisma.activeDay.findFirst({
      where: { userId: prismaUser.id },
      orderBy: { createdAt: 'asc' }
    })

    if (!activeDay) {
      activeDay = await prisma.activeDay.create({
        data: {
          userId: prismaUser.id,
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

    if (authError || !user || !user.email) {
      console.error('Authentication error:', authError || 'No user or email')
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
          user: {
            email: user.email
          }
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