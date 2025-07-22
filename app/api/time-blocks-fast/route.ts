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

    console.log('[DEBUG API time-blocks-fast] Authenticated user:', {
      email: user.email,
      id: user.id
    })

    const { searchParams } = new URL(request.url)
    const pageNumber = parseInt(searchParams.get('page') || '1')
    const cleanup = searchParams.get('cleanup') === 'true' // 🆕 クリーンアップフラグ
    
    // ユーザーの一日の始まり時間を取得
    const dayStartTime = await getUserDayStartTimeByEmail(user.email)
    console.log('[DEBUG API time-blocks-fast] dayStartTime:', dayStartTime)
    
    // ユーザー取得（軽量化：selectで必要フィールドのみ）
    let prismaUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, email: true, dayStartTime: true }
    })
    
    console.log('[DEBUG API time-blocks-fast] Prisma user:', {
      found: !!prismaUser,
      id: prismaUser?.id,
      email: prismaUser?.email,
      dayStartTime: prismaUser?.dayStartTime
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
        select: { id: true, email: true, dayStartTime: true }
      })
      
      console.log('[DEBUG API time-blocks-fast] Created new Prisma user:', prismaUser)
    }
    
    // 一日の始まり時間を考慮した今日の日付を取得
    const today = getTodayInJST(dayStartTime)
    const todayStr = formatDateString(today)
    
    console.log('[DEBUG API time-blocks-fast] Date calculation:', {
      dayStartTime,
      today: today.toISOString(),
      todayStr
    })
    
    // 🔍 まずは全体の状況を調査
    const allActiveDays = await prisma.activeDay.findMany({
      where: { userId: prismaUser.id },
      select: {
        id: true,
        date: true,
        timeBlocks: {
          where: { archived: false },
          select: {
            id: true,
            title: true,
            startTime: true,
            pageNumber: true
          }
        }
      },
      orderBy: { date: 'desc' }
    })
    
    console.log('[DEBUG API time-blocks-fast] All ActiveDays for user:', {
      userId: prismaUser.id,
      count: allActiveDays.length,
      days: allActiveDays.map(day => ({
        id: day.id,
        date: day.date.toISOString(),
        blocksCount: day.timeBlocks.length,
        blockTitles: day.timeBlocks.map(b => b.title)
      }))
    })
    
    // 🔍 ActiveTaskも直接調査してみる
    const allActiveTasks = await prisma.activeTask.findMany({
      where: { 
        archived: false,
        block: {
          day: {
            userId: prismaUser.id
          }
        }
      },
      select: {
        id: true,
        title: true,
        blockId: true,
        block: {
          select: {
            id: true,
            title: true,
            dayId: true,
            day: {
              select: {
                id: true,
                date: true,
                userId: true
              }
            }
          }
        }
      },
      take: 10 // 最初の10個だけ
    })
    
    console.log('[DEBUG API time-blocks-fast] Sample ActiveTasks for user:', {
      userId: prismaUser.id,
      count: allActiveTasks.length,
      tasks: allActiveTasks.map(task => ({
        id: task.id,
        title: task.title,
        blockId: task.blockId,
        blockTitle: task.block.title,
        dayDate: task.block.day.date.toISOString()
      }))
    })
    
    // 🔍 すべてのActiveTimeBlockも調査
    const allActiveTimeBlocks = await prisma.activeTimeBlock.findMany({
      where: { 
        archived: false,
        day: {
          userId: prismaUser.id
        }
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        pageNumber: true,
        dayId: true,
        day: {
          select: {
            id: true,
            date: true
          }
        }
      }
    })
    
    console.log('[DEBUG API time-blocks-fast] All ActiveTimeBlocks for user:', {
      userId: prismaUser.id,
      count: allActiveTimeBlocks.length,
      blocks: allActiveTimeBlocks.map(block => ({
        id: block.id,
        title: block.title,
        startTime: block.startTime,
        pageNumber: block.pageNumber,
        dayDate: block.day.date.toISOString()
      }))
    })
    
    // 永続的なActiveDayを取得または作成（実データ優先）
    let activeDay = null
    
    // 🎯 まず実際の時間ブロックがあるActiveDayを探す
    if (allActiveDays.length > 0) {
      // 時間ブロックがあるActiveDayを優先的に選択
      const daysWithBlocks = allActiveDays.filter(day => day.timeBlocks.length > 0)
      
      if (daysWithBlocks.length > 0) {
        // 最も多くの時間ブロックがある日を選択
        const selectedDay = daysWithBlocks.reduce((prev, current) => 
          current.timeBlocks.length > prev.timeBlocks.length ? current : prev
        )
        activeDay = { id: selectedDay.id }
        
        console.log('[DEBUG API time-blocks-fast] Selected ActiveDay with most blocks:', {
          id: selectedDay.id,
          date: selectedDay.date.toISOString(),
          blocksCount: selectedDay.timeBlocks.length,
          blockTitles: selectedDay.timeBlocks.map(b => b.title),
          reason: `Most blocks (${selectedDay.timeBlocks.length}) among ${daysWithBlocks.length} days with blocks`
        })
      }
    }
    
    // 🔄 フォールバック: 新しいロジック（dayStartTime考慮）で検索
    if (!activeDay) {
      activeDay = await prisma.activeDay.findFirst({
        where: { 
          userId: prismaUser.id,
          date: {
            gte: new Date(todayStr),
            lt: new Date(todayStr + 'T23:59:59.999Z')
          }
        },
        select: { id: true }
      })
      
      console.log('[DEBUG API time-blocks-fast] New logic search result:', {
        found: !!activeDay,
        activeDayId: activeDay?.id,
        searchRange: {
          gte: todayStr,
          lt: todayStr + 'T23:59:59.999Z'
        }
      })
    }
    
    // 🔄 フォールバック: 従来のロジック（JST 00:00基準）でも検索
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

    // 🔍 選択されたActiveDayの詳細調査
    const selectedDayDetails = await prisma.activeDay.findUnique({
      where: { id: activeDay.id },
      include: {
        timeBlocks: {
          where: { archived: false },
          select: {
            id: true,
            title: true,
            startTime: true,
            pageNumber: true,
            orderIndex: true
          }
        }
      }
    })
    
    console.log('[DEBUG API time-blocks-fast] Selected ActiveDay details:', {
      id: selectedDayDetails?.id,
      date: selectedDayDetails?.date.toISOString(),
      allBlocksCount: selectedDayDetails?.timeBlocks.length,
      allBlocks: selectedDayDetails?.timeBlocks.map(b => ({
        id: b.id,
        title: b.title,
        pageNumber: b.pageNumber
      })),
      page1Blocks: selectedDayDetails?.timeBlocks.filter(b => b.pageNumber === 1).length
    })

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

    console.log('[DEBUG API time-blocks-fast] Final time blocks query:', {
      dayId: activeDay.id,
      pageNumber,
      resultCount: timeBlocks.length,
      blocks: timeBlocks.map(b => ({
        id: b.id,
        title: b.title,
        startTime: b.startTime
      }))
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