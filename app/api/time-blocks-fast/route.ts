import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getUserDayStartTimeByEmail } from '@/lib/server-utils'
import { getTodayInJST, formatDateString } from '@/lib/date-utils'

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
    
    // ユーザーの一日の始まり時間を取得
    const dayStartTime = await getUserDayStartTimeByEmail(user.email)
    console.log('[DEBUG API time-blocks-fast] dayStartTime:', dayStartTime)
    
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
          dayStartTime: dayStartTime
        },
        select: { id: true }
      })
    }
    
    // 一日の始まり時間を考慮した今日の日付を取得
    const today = getTodayInJST(dayStartTime)
    const todayStr = formatDateString(today)
    
    console.log('[DEBUG API time-blocks-fast] Date calculation:', {
      dayStartTime,
      today: today.toISOString(),
      todayStr
    })
    
    // 永続的なActiveDayを取得または作成（互換性を考慮）
    // まず新しいロジック（dayStartTime考慮）で検索
    let activeDay = await prisma.activeDay.findFirst({
      where: { 
        userId: prismaUser.id,
        date: {
          gte: new Date(todayStr),
          lt: new Date(todayStr + 'T23:59:59.999Z')
        }
      },
      select: { id: true }
    })
    
    // 見つからない場合は、従来のロジック（JST 00:00基準）でも検索
    if (!activeDay) {
      console.log('[DEBUG API time-blocks-fast] No ActiveDay found with new logic, trying legacy logic')
      
      // 既存のActiveDayを検索（互換性のため）
      activeDay = await prisma.activeDay.findFirst({
        where: { 
          userId: prismaUser.id
        },
        select: { id: true },
        orderBy: { date: 'desc' } // 最新のActiveDayを取得
      })
      
      console.log('[DEBUG API time-blocks-fast] Found legacy ActiveDay:', {
        id: activeDay?.id,
        exists: !!activeDay
      })
    }
    
    if (!activeDay) {
      activeDay = await prisma.activeDay.create({
        data: {
          userId: prismaUser.id,
          date: today
        },
        select: { id: true }
      })
      
      console.log('[DEBUG API time-blocks-fast] Created new ActiveDay:', {
        id: activeDay.id,
        date: today.toISOString()
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

    console.log('[DEBUG API time-blocks-fast] Final result:', {
      activeDayId: activeDay.id,
      pageNumber,
      timeBlocksCount: timeBlocks.length,
      timeBlockTitles: timeBlocks.map(block => block.title)
    })

    // 総ページ数計算
    const totalBlocks = await prisma.activeTimeBlock.count({
      where: {
        dayId: activeDay.id,
        archived: false
      }
    })

    console.log('[DEBUG API time-blocks-fast] Total blocks in ActiveDay:', totalBlocks)
    
    // ⚠️ デバッグ用：データがない場合はサンプルデータを作成
    if (timeBlocks.length === 0) {
      console.log('[DEBUG API time-blocks-fast] No time blocks found, creating sample data...')
      
      // サンプル時間ブロックを作成
      const sampleBlocks = await prisma.activeTimeBlock.createMany({
        data: [
          {
            dayId: activeDay.id,
            title: '朝のルーティン',
            startTime: '06:00',
            orderIndex: 0,
            pageNumber: 1,
            archived: false
          },
          {
            dayId: activeDay.id,
            title: '午前の作業',
            startTime: '09:00',
            orderIndex: 1,
            pageNumber: 1,
            archived: false
          }
        ]
      })
      
      console.log('[DEBUG API time-blocks-fast] Created sample blocks:', sampleBlocks.count)
      
      // 作成後、再度データを取得
      const newTimeBlocks = await prisma.activeTimeBlock.findMany({
        where: {
          dayId: activeDay.id,
          pageNumber: pageNumber,
          archived: false
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
      
      console.log('[DEBUG API time-blocks-fast] After sample creation:', newTimeBlocks.length)
      
      return NextResponse.json(newTimeBlocks)
    }
    
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