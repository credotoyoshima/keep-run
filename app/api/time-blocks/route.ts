import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUserByEmail } from '@/lib/server-utils'

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
    
    // Prismaユーザーを取得または作成
    const prismaUser = await getOrCreateUserByEmail(user.email)
    
    if (mode === 'today') {
      // 今日の日付を取得（日本時間を考慮）
      const now = new Date()
      const jstOffset = 9 * 60 * 60 * 1000 
      const todayJST = new Date(now.getTime() + jstOffset)
      
      const startOfDayJST = new Date(todayJST)
      startOfDayJST.setHours(0, 0, 0, 0)
      const endOfDayJST = new Date(todayJST)
      endOfDayJST.setHours(23, 59, 59, 999)
      
      const startOfDayUTC = new Date(startOfDayJST.getTime() - jstOffset)
      const endOfDayUTC = new Date(endOfDayJST.getTime() - jstOffset)

      // 今日のActiveDayを取得
      let activeDay = await prisma.activeDay.findFirst({
        where: {
          userId: prismaUser.id,
          date: {
            gte: startOfDayUTC,
            lte: endOfDayUTC
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

      if (!activeDay) {
        // 今日のActiveDayが存在しない場合は作成
        activeDay = await prisma.activeDay.create({
          data: {
            userId: prismaUser.id,
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
      }

      return NextResponse.json(activeDay)
    } else {
      // ページモード（永続的なActiveDay）
      let activeDay = await prisma.activeDay.findFirst({
        where: { userId: prismaUser.id }
      })
      
      if (!activeDay) {
        activeDay = await prisma.activeDay.create({
          data: {
            userId: prismaUser.id,
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
    
    // Prismaユーザーを取得
    const prismaUser = await getOrCreateUserByEmail(user.email)

    switch (type) {
      case 'addTimeBlock': {
        // dayIdが提供されない場合、ユーザーの永続的なActiveDayを使用
        let targetDayId = dayId
        if (!targetDayId) {
          const activeDay = await prisma.activeDay.findFirst({
            where: { userId: prismaUser.id }
          })
          if (!activeDay) {
            const newDay = await prisma.activeDay.create({
              data: {
                userId: prismaUser.id,
                date: new Date()
              }
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