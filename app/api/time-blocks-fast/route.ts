import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getUserDayStartTimeByEmail } from '@/lib/server-utils'
import { getTodayInJST, formatDateString, hasPassedDayBoundary } from '@/lib/date-utils'

// 高速化されたtime-blocksエンドポイント
export async function GET(request: NextRequest) {
  try {
    // ミドルウェアからの認証情報を使用（高速化）
    let userEmail = request.headers.get('x-user-email')
    let userId = request.headers.get('x-user-id')
    
    if (!userEmail || !userId) {
      // フォールバック：ミドルウェアが動かない場合のみ
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user || !user.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      userEmail = user.email
      userId = user.id
    }

    const { searchParams } = new URL(request.url)
    const pageNumber = parseInt(searchParams.get('page') || '1')
    
    // ユーザーの一日の始まり時間を取得
    const dayStartTime = await getUserDayStartTimeByEmail(userEmail)
    
    // ユーザー取得（軽量化：selectで必要フィールドのみ）
    let prismaUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, dayStartTime: true }
    })
    
    // ユーザーが存在しない場合のみ作成
    if (!prismaUser) {
      prismaUser = await prisma.user.create({
        data: {
          id: userId,
          email: userEmail,
          name: null,
          avatarUrl: null,
          dayStartTime: dayStartTime
        },
        select: { id: true, email: true, dayStartTime: true }
      })
    }
    
    // 一日の始まり時間を考慮した今日の日付を取得
    const today = getTodayInJST(dayStartTime)
    const todayStr = formatDateString(today)
    
    // 永続的なActiveDayを取得または作成
    let activeDay = null
    
    // まず既存のActiveDayで時間ブロックがあるものを検索（永続的な使用）
    activeDay = await prisma.activeDay.findFirst({
      where: { 
        userId: prismaUser.id,
        timeBlocks: {
          some: {
            archived: false
          }
        }
      },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }
    })
    
    // 既存のActiveDayがない場合は、最新のActiveDayを取得
    if (!activeDay) {
      activeDay = await prisma.activeDay.findFirst({
        where: { userId: prismaUser.id },
        select: { id: true, updatedAt: true },
        orderBy: { createdAt: 'desc' }
      })
    }
    
    // それでもない場合は新規作成
    if (!activeDay) {
      activeDay = await prisma.activeDay.create({
        data: {
          userId: prismaUser.id,
          date: today
        },
        select: { id: true, updatedAt: true }
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
            orderIndex: true,
            updatedAt: true  // タスクの更新日時を取得
          },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { orderIndex: 'asc' }
    })

    // 日またぎチェックとタスクのリセット
    const tasksToReset: string[] = []
    const processedTimeBlocks = timeBlocks.map(block => ({
      ...block,
      tasks: block.tasks.map(task => {
        // タスクが完了状態で、かつ日をまたいでいる場合
        if (task.completed && hasPassedDayBoundary(task.updatedAt, dayStartTime)) {
          tasksToReset.push(task.id)
          return { ...task, completed: false }
        }
        return task
      })
    }))

    // リセットが必要なタスクがある場合は、データベースを更新
    if (tasksToReset.length > 0) {
      await prisma.activeTask.updateMany({
        where: {
          id: { in: tasksToReset }
        },
        data: {
          completed: false
        }
      })
      
      // 完了率も再計算（バッチ処理で高速化）
      const updatePromises = processedTimeBlocks
        .map(block => {
          const completedTasks = block.tasks.filter(t => t.completed).length
          const totalTasks = block.tasks.length
          const newCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
          
          if (Math.abs(block.completionRate - newCompletionRate) > 0.01) {
            block.completionRate = newCompletionRate
            return prisma.activeTimeBlock.update({
              where: { id: block.id },
              data: { completionRate: newCompletionRate }
            })
          }
          return null
        })
        .filter(p => p !== null)
      
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises)
      }
    }

    // updatedAtフィールドを除去してレスポンスを返す
    const responseBlocks = processedTimeBlocks.map(block => ({
      ...block,
      tasks: block.tasks.map(({ updatedAt, ...task }) => task)
    }))

    return NextResponse.json(responseBlocks)
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
    // ミドルウェアからの認証情報を使用（高速化）
    let userEmail = request.headers.get('x-user-email')
    let userId = request.headers.get('x-user-id')
    
    if (!userEmail || !userId) {
      // フォールバック
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user || !user.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      userEmail = user.email
      userId = user.id
    }

    const body = await request.json()
    const { type, dayId, blockId, data } = body
    
    // 軽量ユーザー取得
    const prismaUser = await prisma.user.findUniqueOrThrow({
      where: { email: userEmail },
      select: { id: true }
    })

    switch (type) {
      case 'addTimeBlock': {
        let targetDayId = dayId
        if (!targetDayId) {
          // 永続的なActiveDayを取得（GETと同じロジック）
          let activeDay = await prisma.activeDay.findFirst({
            where: { 
              userId: prismaUser.id,
              timeBlocks: {
                some: {
                  archived: false
                }
              }
            },
            select: { id: true },
            orderBy: { updatedAt: 'desc' }
          })
          
          if (!activeDay) {
            activeDay = await prisma.activeDay.findFirst({
              where: { userId: prismaUser.id },
              select: { id: true },
              orderBy: { createdAt: 'desc' }
            })
          }
          
          if (!activeDay) {
            const dayStartTime = await getUserDayStartTimeByEmail(userEmail)
            const today = getTodayInJST(dayStartTime)
            activeDay = await prisma.activeDay.create({
              data: {
                userId: prismaUser.id,
                date: today
              },
              select: { id: true }
            })
          }
          
          targetDayId = activeDay.id
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