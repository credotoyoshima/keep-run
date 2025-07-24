import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getUserDayStartTimeByEmail } from '@/lib/server-utils'
import { migrateOrGetUser } from '@/lib/utils/userMigration'
import { getTodayInJST, formatDateString } from '@/lib/date-utils'

// 前日のActiveDay構造を継承して新しいActiveDayを作成する関数
async function createActiveDayFromTemplate(userId: string, date: Date) {
  // 前日までのActiveDayから最新のものを取得（アーカイブされていないブロック・タスクのみ）
  const previousActiveDay = await prisma.activeDay.findFirst({
    where: { 
      userId,
      date: { lt: date } // 指定日より前
    },
    include: {
      timeBlocks: {
        where: { archived: false },
        include: {
          tasks: {
            where: { archived: false },
            orderBy: { orderIndex: 'asc' }
          }
        },
        orderBy: { orderIndex: 'asc' }
      }
    },
    orderBy: { date: 'desc' } // 最新の過去の日を取得
  })

  if (previousActiveDay && previousActiveDay.timeBlocks.length > 0) {
    // 前日の構造を継承して新しいActiveDayを作成
    const newActiveDay = await prisma.activeDay.create({
      data: {
        userId,
        date,
        timeBlocks: {
          create: previousActiveDay.timeBlocks.map(block => ({
            title: block.title,
            startTime: block.startTime,
            orderIndex: block.orderIndex,
            pageNumber: block.pageNumber,
            completionRate: 0, // 完了率はリセット
            tasks: {
              create: block.tasks.map(task => ({
                title: task.title,
                orderIndex: task.orderIndex,
                completed: false, // 完了状態はリセット
                archived: false
              }))
            }
          }))
        }
      },
      include: {
        timeBlocks: {
          where: { archived: false },
          include: {
            tasks: {
              where: { archived: false },
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      }
    })
    
    console.log('[DEBUG] Created ActiveDay from template, inherited blocks:', previousActiveDay.timeBlocks.length)
    return newActiveDay
  } else {
    // 前日の構造がない場合は空のActiveDayを作成（デフォルトタスクなし）
    const newActiveDay = await prisma.activeDay.create({
      data: {
        userId,
        date
      },
      include: {
        timeBlocks: {
          where: { archived: false },
          include: {
            tasks: {
              where: { archived: false },
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      }
    })
    
    console.log('[DEBUG] Created empty ActiveDay (no previous template found)')
    return newActiveDay
  }
}

// 統合されたGETエンドポイント
// クエリパラメータ:
// - page: ページ番号（デフォルト: 1）
// - mode: "page" または "today"（デフォルト: "page"）
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || !user.email) {
      console.error('Authentication error:', authError || 'No user or email')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pageNumber = parseInt(searchParams.get('page') || '1')
    const mode = searchParams.get('mode') || 'page'
    
    // ユーザーの一日の始まり時間を取得
    const dayStartTime = await getUserDayStartTimeByEmail(user.email)
    console.log('[DEBUG API time-blocks] dayStartTime:', dayStartTime)
    
    // Prismaユーザーを取得または移行
    const prismaUser = await migrateOrGetUser(user.id, user.email)
    
    if (mode === 'today') {
      // 一日の始まり時間を考慮した今日の日付を取得
      const today = getTodayInJST(dayStartTime)
      const todayStr = formatDateString(today)
      
      console.log('[DEBUG API time-blocks] Date calculation:', {
        dayStartTime,
        today: today.toISOString(),
        todayStr
      })

      // 今日のActiveDayを取得または作成
      let activeDay = await prisma.activeDay.findFirst({
        where: { 
          userId: prismaUser.id,
          date: {
            gte: new Date(todayStr),
            lt: new Date(todayStr + 'T23:59:59.999Z')
          }
        }
      })

      if (!activeDay) {
        // 今日のActiveDayが存在しない場合は作成
        activeDay = await createActiveDayFromTemplate(prismaUser.id, today)
      }

      return NextResponse.json(activeDay)
    } else {
      // ページモード（永続的なActiveDay、互換性を考慮）
      const today = getTodayInJST(dayStartTime)
      const todayStr = formatDateString(today)
      
      console.log('[DEBUG API time-blocks] Page mode date calculation:', {
        dayStartTime,
        today: today.toISOString(),
        todayStr
      })
      
      // まず新しいロジック（dayStartTime考慮）で検索
      let activeDay = await prisma.activeDay.findFirst({
        where: { 
          userId: prismaUser.id,
          date: {
            gte: new Date(todayStr),
            lt: new Date(todayStr + 'T23:59:59.999Z')
          }
        }
      })
      
      // 見つからない場合は、従来のロジック（JST 00:00基準）でも検索
      if (!activeDay) {
        console.log('[DEBUG API time-blocks] No ActiveDay found with new logic, trying legacy logic')
        
        // 既存のActiveDayを検索（互換性のため）
        activeDay = await prisma.activeDay.findFirst({
          where: { userId: prismaUser.id },
          orderBy: { date: 'desc' } // 最新のActiveDayを取得
        })
        
        console.log('[DEBUG API time-blocks] Found legacy ActiveDay:', {
          id: activeDay?.id,
          exists: !!activeDay
        })
      }
      
      if (!activeDay) {
        activeDay = await createActiveDayFromTemplate(prismaUser.id, today)
        
        console.log('[DEBUG API time-blocks] Created new ActiveDay for page mode:', {
          id: activeDay.id,
          date: today.toISOString()
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
      
      return NextResponse.json(timeBlocks)
    }
  } catch (error) {
    console.error('Error fetching time blocks:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// 時間ブロックおよびタスクの操作
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, dayId, blockId, data } = body
    
    // ユーザーの一日の始まり時間を取得
    const dayStartTime = await getUserDayStartTimeByEmail(user.email)
    
    // Prismaユーザーを取得
    const prismaUser = await migrateOrGetUser(user.id, user.email)

    switch (type) {
      case 'addTimeBlock': {
        // dayIdが提供されない場合、ユーザーの永続的なActiveDayを使用（互換性を考慮）
        let targetDayId = dayId
        if (!targetDayId) {
          const today = getTodayInJST(dayStartTime)
          const todayStr = formatDateString(today)
          
          // まず新しいロジックで検索
          let activeDay = await prisma.activeDay.findFirst({
            where: { 
              userId: prismaUser.id,
              date: {
                gte: new Date(todayStr),
                lt: new Date(todayStr + 'T23:59:59.999Z')
              }
            }
          })
          
          // 見つからない場合は既存のActiveDayを使用
          if (!activeDay) {
            activeDay = await prisma.activeDay.findFirst({
              where: { userId: prismaUser.id },
              orderBy: { date: 'desc' }
            })
          }
          
          if (!activeDay) {
            const newDay = await createActiveDayFromTemplate(prismaUser.id, today)
            targetDayId = newDay.id
            console.log('[DEBUG API time-blocks] Created new ActiveDay in POST:', {
              id: newDay.id,
              date: today.toISOString()
            })
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
          include: {
            tasks: true
          }
        })

        return NextResponse.json(newBlock)
      }

      case 'addTask': {
        const lastTask = await prisma.activeTask.findFirst({
          where: { blockId },
          orderBy: { orderIndex: 'desc' }
        })

        const newTask = await prisma.activeTask.create({
          data: {
            title: data.title,
            orderIndex: (lastTask?.orderIndex ?? -1) + 1,
            blockId
          }
        })

        return NextResponse.json(newTask)
      }

      case 'toggleTask': {
        const task = await prisma.activeTask.update({
          where: { id: data.taskId },
          data: { completed: data.completed }
        })

        // 時間ブロックの完了率を更新
        const block = await prisma.activeTimeBlock.findUnique({
          where: { id: blockId },
          include: { 
            tasks: {
              where: { archived: false }
            } 
          }
        })

        if (block) {
          const completedTasks = block.tasks.filter(t => t.completed).length
          const completionRate = block.tasks.length > 0 ? completedTasks / block.tasks.length : 0

          await prisma.activeTimeBlock.update({
            where: { id: blockId },
            data: { completionRate }
          })
        }

        return NextResponse.json(task)
      }

      case 'updateTimeBlock': {
        const updatedBlock = await prisma.activeTimeBlock.update({
          where: { id: blockId },
          data: {
            title: data.title,
            startTime: data.startTime
          },
          include: {
            tasks: {
              where: { archived: false },
              orderBy: { orderIndex: 'asc' }
            }
          }
        })

        return NextResponse.json(updatedBlock)
      }

      case 'deleteTimeBlock': {
        // 関連するタスクを論理削除
        await prisma.activeTask.updateMany({
          where: { 
            blockId,
            archived: false 
          },
          data: { archived: true }
        })

        // 時間ブロックを論理削除
        await prisma.activeTimeBlock.update({
          where: { id: blockId },
          data: { archived: true }
        })

        return NextResponse.json({ success: true })
      }

      case 'deleteTask': {
        // タスクを論理削除
        await prisma.activeTask.update({
          where: { id: data.taskId },
          data: { archived: true }
        })

        // 削除後の時間ブロックを取得して完了率を更新
        const updatedBlock = await prisma.activeTimeBlock.findUnique({
          where: { id: blockId },
          include: { 
            tasks: {
              where: { archived: false }
            } 
          }
        })

        if (updatedBlock) {
          const completedTasks = updatedBlock.tasks.filter(t => t.completed).length
          const completionRate = updatedBlock.tasks.length > 0 ? completedTasks / updatedBlock.tasks.length : 0

          await prisma.activeTimeBlock.update({
            where: { id: blockId },
            data: { completionRate }
          })
        }

        return NextResponse.json({ success: true })
      }

      case 'reorderTimeBlocks': {
        const updatePromises = data.blocks.map((block: { id: string; orderIndex: number }) =>
          prisma.activeTimeBlock.update({
            where: { id: block.id },
            data: { orderIndex: block.orderIndex }
          })
        )

        await Promise.all(updatePromises)
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Invalid action type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating time blocks:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// 時間ブロックを削除（DELETE）
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || !user.email) {
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