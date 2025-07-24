import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getTodayInJST, getDateForDayStart, formatDateString } from '@/lib/date-utils'
import { migrateOrGetUser } from '@/lib/utils/userMigration'
import { getUserDayStartTimeByEmail } from '@/lib/server-utils'

// 日付が変わった時にタスクの完了状態をリセット
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーの一日の始まり時間を取得
    const dayStartTime = await getUserDayStartTimeByEmail(user.email)
    
    // Prismaユーザーを取得
    const prismaUser = await migrateOrGetUser(user.id, user.email)
    
    // 今日の日付を取得（dayStartTimeを考慮）
    const today = getTodayInJST(dayStartTime)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // 昨日以前のActiveDayのタスクをリセット
    const activeDays = await prisma.activeDay.findMany({
      where: {
        userId: prismaUser.id,
        date: {
          lt: today
        }
      },
      include: {
        timeBlocks: {
          include: {
            tasks: true
          }
        }
      }
    })

    // トランザクションでタスクの完了状態をリセット
    await prisma.$transaction(async (tx) => {
      for (const day of activeDays) {
        for (const block of day.timeBlocks) {
          // アーカイブされていないタスクの完了状態をリセット
          const taskIds = block.tasks
            .filter(task => !task.archived && task.completed)
            .map(task => task.id)
          
          if (taskIds.length > 0) {
            await tx.activeTask.updateMany({
              where: {
                id: { in: taskIds }
              },
              data: {
                completed: false
              }
            })
            
            // ブロックの完了率もリセット
            await tx.activeTimeBlock.update({
              where: { id: block.id },
              data: { completionRate: 0 }
            })
          }
        }
      }
    })

    console.log(`[DEBUG] Reset tasks for user ${prismaUser.id}, days affected: ${activeDays.length}`)

    return NextResponse.json({ 
      success: true, 
      message: 'Tasks reset successfully',
      daysAffected: activeDays.length 
    })
  } catch (error) {
    console.error('Error resetting tasks:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}