import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Authentication error', details: authError.message }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - No user found' }, { status: 401 })
    }

    // Prisma接続を確認
    try {
      await prisma.$connect()
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 })
    }

    // 今日の日付を取得（日本時間を考慮）
    const now = new Date()
    const jstOffset = 9 * 60 * 60 * 1000 // 日本時間はUTC+9（ミリ秒）
    const todayJST = new Date(now.getTime() + jstOffset)
    
    // 日本時間の今日の開始と終了
    const startOfDayJST = new Date(todayJST)
    startOfDayJST.setHours(0, 0, 0, 0)
    const endOfDayJST = new Date(todayJST)
    endOfDayJST.setHours(23, 59, 59, 999)
    
    // UTCに変換
    const startOfDayUTC = new Date(startOfDayJST.getTime() - jstOffset)
    const endOfDayUTC = new Date(endOfDayJST.getTime() - jstOffset)

    console.log('Date calculation debug:', {
      now: now.toISOString(),
      todayJST: todayJST.toISOString(),
      startOfDayJST: startOfDayJST.toISOString(),
      startOfDayUTC: startOfDayUTC.toISOString(),
      endOfDayUTC: endOfDayUTC.toISOString()
    })

    // 今日のActiveDayを取得
    let activeDay = await prisma.activeDay.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: startOfDayUTC,
          lte: endOfDayUTC
        }
      },
      include: {
        timeBlocks: {
          include: {
            tasks: {
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      }
    })

    console.log('Found activeDay:', activeDay ? { id: activeDay.id, date: activeDay.date } : 'none')

    if (!activeDay) {
      // 今日のActiveDayが存在しない場合は作成
      console.log('Creating new ActiveDay for today')
      activeDay = await prisma.activeDay.create({
        data: {
          userId: user.id,
          date: startOfDayUTC,
          timeBlocks: {
            create: [
              {
                title: '朝のルーティン',
                startTime: '06:00',
                orderIndex: 0,
                tasks: {
                  create: [
                    { title: '起床・身支度', orderIndex: 0 },
                    { title: '朝食', orderIndex: 1 }
                  ]
                }
              },
              {
                title: '午前の作業',
                startTime: '09:00',
                orderIndex: 1,
                tasks: {
                  create: [
                    { title: 'メールチェック', orderIndex: 0 },
                    { title: '重要タスクの処理', orderIndex: 1 }
                  ]
                }
              }
            ]
          }
        },
        include: {
          timeBlocks: {
            include: {
              tasks: {
                orderBy: { orderIndex: 'asc' }
              }
            },
            orderBy: { orderIndex: 'asc' }
          }
        }
      })
    }

    return NextResponse.json(activeDay)
  } catch (error) {
    console.error('Error fetching active day:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: errorMessage,
      type: error?.constructor?.name || 'Unknown'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, dayId, blockId, data } = body

    switch (type) {
      case 'addTimeBlock': {
        const lastBlock = await prisma.activeTimeBlock.findFirst({
          where: { dayId },
          orderBy: { orderIndex: 'desc' }
        })

        const newBlock = await prisma.activeTimeBlock.create({
          data: {
            title: data.title,
            startTime: data.startTime,
            orderIndex: (lastBlock?.orderIndex ?? -1) + 1,
            dayId
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
              orderBy: { orderIndex: 'asc' }
            }
          }
        })

        return NextResponse.json(updatedBlock)
      }

      case 'deleteTimeBlock': {
        // まず関連するタスクを論理削除
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
        // 時間ブロックの順序を更新
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
    console.error('Error updating active day:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}