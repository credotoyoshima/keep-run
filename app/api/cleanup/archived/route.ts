import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// 90日以上前のアーカイブデータを物理削除するバッチ処理
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 90日前の日付を計算
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    // 削除結果を格納
    const results = {
      todos: 0,
      activeTasks: 0,
      activeTimeBlocks: 0,
      routineCompletions: 0
    }

    // 1. アーカイブされたToDoを削除（90日以上前）
    const deletedTodos = await prisma.todo.deleteMany({
      where: {
        archived: true,
        updatedAt: {
          lt: ninetyDaysAgo
        }
      }
    })
    results.todos = deletedTodos.count

    // 2. アーカイブされたActiveTaskを削除（90日以上前）
    const deletedActiveTasks = await prisma.activeTask.deleteMany({
      where: {
        archived: true,
        updatedAt: {
          lt: ninetyDaysAgo
        }
      }
    })
    results.activeTasks = deletedActiveTasks.count

    // 3. アーカイブされたActiveTimeBlockを削除（90日以上前）
    // まず、アーカイブされたブロックに関連する全てのタスクを削除
    const archivedBlocks = await prisma.activeTimeBlock.findMany({
      where: {
        archived: true,
        updatedAt: {
          lt: ninetyDaysAgo
        }
      },
      select: { id: true }
    })

    if (archivedBlocks.length > 0) {
      const blockIds = archivedBlocks.map(block => block.id)
      
      // 関連するタスクを削除
      await prisma.activeTask.deleteMany({
        where: {
          blockId: {
            in: blockIds
          }
        }
      })

      // ブロック自体を削除
      const deletedBlocks = await prisma.activeTimeBlock.deleteMany({
        where: {
          id: {
            in: blockIds
          }
        }
      })
      results.activeTimeBlocks = deletedBlocks.count
    }

    // 4. 古いルーティン完了記録を削除（90日以上前）
    const deletedRoutineCompletions = await prisma.todoRoutineCompletion.deleteMany({
      where: {
        completedDate: {
          lt: ninetyDaysAgo
        }
      }
    })
    results.routineCompletions = deletedRoutineCompletions.count

    // 5. 空のActiveDayを削除（関連データがない場合）
    // これはオプションですが、データベースをクリーンに保つために有効です
    const emptyDays = await prisma.activeDay.findMany({
      where: {
        date: {
          lt: ninetyDaysAgo
        },
        timeBlocks: {
          none: {}
        }
      },
      select: { id: true }
    })

    if (emptyDays.length > 0) {
      await prisma.activeDay.deleteMany({
        where: {
          id: {
            in: emptyDays.map(day => day.id)
          }
        }
      })
    }

    return NextResponse.json({
      message: 'Archived data cleanup completed successfully',
      deletedCounts: results,
      cleanupDate: new Date().toISOString(),
      cutoffDate: ninetyDaysAgo.toISOString()
    })
  } catch (error) {
    console.error('Error cleaning up archived data:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup archived data' },
      { status: 500 }
    )
  }
}

// 定期実行用のGETエンドポイント（cronジョブなどから呼び出し可能）
export async function GET(request: NextRequest) {
  // セキュリティのため、特定のヘッダーやトークンをチェック
  const authHeader = request.headers.get('x-cron-secret')
  
  // 環境変数でCRON用のシークレットを設定
  if (process.env.CRON_SECRET && authHeader !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // POSTメソッドと同じ処理を実行
  return POST()
}