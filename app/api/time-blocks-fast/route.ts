import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// 高速化されたtime-blocksエンドポイント
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pageNumber = parseInt(searchParams.get('page') || '1')
    
    // ユーザー取得（軽量化：selectで必要フィールドのみ）
    let prismaUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true }
    })
    
    // ユーザーが存在しない場合のみ作成
    if (!prismaUser) {
      prismaUser = await prisma.user.create({
        data: {
          email: user.email,
          name: null,
          avatarUrl: null,
          dayStartTime: '05:00'
        },
        select: { id: true }
      })
    }
    
    // 永続的なActiveDayを取得または作成（軽量化）
    let activeDay = await prisma.activeDay.findFirst({
      where: { userId: prismaUser.id },
      select: { id: true }
    })
    
    if (!activeDay) {
      activeDay = await prisma.activeDay.create({
        data: {
          userId: prismaUser.id,
          date: new Date()
        },
        select: { id: true }
      })
    }
    
    // 最適化されたクエリ：インデックスを活用
    const timeBlocks = await prisma.activeTimeBlock.findMany({
      where: {
        dayId: activeDay.id,
        pageNumber: pageNumber,
        archived: false // インデックスが効く
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        orderIndex: true,
        completionRate: true,
        tasks: {
          where: { archived: false },
          select: {
            id: true,
            title: true,
            completed: true,
            orderIndex: true
          },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { orderIndex: 'asc' }
    })
    
    return NextResponse.json(timeBlocks)
  } catch (error) {
    console.error('Error fetching time blocks (fast):', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST処理も軽量化
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, dayId, blockId, data } = body
    
    // 軽量ユーザー取得
    const prismaUser = await prisma.user.findUniqueOrThrow({
      where: { email: user.email },
      select: { id: true }
    })

    switch (type) {
      case 'addTimeBlock': {
        let targetDayId = dayId
        if (!targetDayId) {
          const activeDay = await prisma.activeDay.findFirst({
            where: { userId: prismaUser.id },
            select: { id: true }
          })
          
          if (!activeDay) {
            const newDay = await prisma.activeDay.create({
              data: {
                userId: prismaUser.id,
                date: new Date()
              },
              select: { id: true }
            })
            targetDayId = newDay.id
          } else {
            targetDayId = activeDay.id
          }
        }

        const pageNumber = data.pageNumber || 1
        const lastBlock = await prisma.activeTimeBlock.findFirst({
          where: { 
            dayId: targetDayId,
            pageNumber: pageNumber
          },
          select: { orderIndex: true },
          orderBy: { orderIndex: 'desc' }
        })

        const newBlock = await prisma.activeTimeBlock.create({
          data: {
            title: data.title,
            startTime: data.startTime,
            orderIndex: (lastBlock?.orderIndex ?? -1) + 1,
            pageNumber: pageNumber,
            dayId: targetDayId
          },
          select: {
            id: true,
            title: true,
            startTime: true,
            orderIndex: true,
            completionRate: true,
            tasks: {
              select: {
                id: true,
                title: true,
                completed: true,
                orderIndex: true
              }
            }
          }
        })

        return NextResponse.json(newBlock)
      }

      case 'addTask': {
        const lastTask = await prisma.activeTask.findFirst({
          where: { blockId },
          select: { orderIndex: true },
          orderBy: { orderIndex: 'desc' }
        })

        const newTask = await prisma.activeTask.create({
          data: {
            title: data.title,
            orderIndex: (lastTask?.orderIndex ?? -1) + 1,
            blockId
          },
          select: {
            id: true,
            title: true,
            completed: true,
            orderIndex: true
          }
        })

        return NextResponse.json(newTask)
      }

      case 'toggleTask': {
        const task = await prisma.activeTask.update({
          where: { id: data.taskId },
          data: { completed: data.completed },
          select: {
            id: true,
            completed: true
          }
        })

        return NextResponse.json(task)
      }

      case 'deleteTask': {
        await prisma.activeTask.update({
          where: { id: data.taskId },
          data: { archived: true }
        })

        return NextResponse.json({ success: true })
      }

      case 'deleteTimeBlock': {
        await prisma.activeTask.updateMany({
          where: { 
            blockId,
            archived: false 
          },
          data: { archived: true }
        })

        await prisma.activeTimeBlock.update({
          where: { id: blockId },
          data: { archived: true }
        })

        return NextResponse.json({ success: true })
      }

      case 'updateTimeBlock': {
        const updatedBlock = await prisma.activeTimeBlock.update({
          where: { id: blockId },
          data: {
            title: data.title,
            startTime: data.startTime
          },
          select: {
            id: true,
            title: true,
            startTime: true,
            orderIndex: true,
            completionRate: true,
            tasks: {
              where: { archived: false },
              select: {
                id: true,
                title: true,
                completed: true,
                orderIndex: true
              },
              orderBy: { orderIndex: 'asc' }
            }
          }
        })

        return NextResponse.json(updatedBlock)
      }

      default:
        return NextResponse.json({ error: 'Invalid action type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating time blocks (fast):', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 