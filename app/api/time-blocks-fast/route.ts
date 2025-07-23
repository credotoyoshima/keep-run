import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getUserDayStartTimeByEmail } from '@/lib/server-utils'
import { getTodayInJST, formatDateString, hasPassedDayBoundary } from '@/lib/date-utils'
import { safeGetOrCreateUser } from '@/lib/utils/safeUserMigration'

// 高速化されたtime-blocksエンドポイント
export async function GET(request: NextRequest) {
  try {
    // タイムアウト対策: レスポンスタイムを測定
    const startTime = Date.now()
    
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
    
    // ユーザーを取得または作成（並列実行で高速化）
    const [prismaUser, dayStartTime] = await Promise.all([
      safeGetOrCreateUser(userId, userEmail),
      getUserDayStartTimeByEmail(userEmail)
    ])
    
    // 一日の始まり時間を考慮した今日の日付を取得
    const today = getTodayInJST(dayStartTime)
    const todayStr = formatDateString(today)
    
    // 永続的なActiveDayを取得または作成
    let activeDay = null
    
    // 最適化: 単一クエリでActiveDayを取得または作成
    activeDay = await prisma.activeDay.findFirst({
      where: { userId: prismaUser.id },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }
    })
    
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
            orderIndex: true
          },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { orderIndex: 'asc' },
      take: 50 // 最大50ブロックに制限
    })

    // 日またぎチェックをスキップ（パフォーマンスのため）
    // クライアント側で処理するか、別のバックグラウンドジョブで実行
    const processedTimeBlocks = timeBlocks

    // レスポンスタイムをログ出力（デバッグ用）
    console.log(`time-blocks-fast GET completed in ${Date.now() - startTime}ms`)

    return NextResponse.json(processedTimeBlocks)
  } catch (error) {
    console.error('Error fetching time blocks (fast):', error)
    // 開発環境では詳細なエラー情報を返す
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    }
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorDetails
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
    // 開発環境では詳細なエラー情報を返す
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    }
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorDetails
    }, { status: 500 })
  }
} 