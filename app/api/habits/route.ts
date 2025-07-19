import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getTodayInJST, formatDateString } from '@/lib/date-utils'
import { getUserDayStartTimeByEmail } from '@/lib/server-utils'

// アクティブな習慣を取得
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // アクティブな習慣を取得（現在は1つのみ想定）
    const habit = await prisma.continuousHabit.findFirst({
      where: {
        userId: user.id,
        isActive: true
      },
      include: {
        records: {
          orderBy: {
            date: 'desc'
          }
        }
      }
    })

    if (!habit) {
      // 完了した習慣があるか確認
      const completedHabit = await prisma.continuousHabit.findFirst({
        where: {
          userId: user.id,
          isActive: false
        },
        include: {
          records: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      if (completedHabit) {
        const completedDays = completedHabit.records.filter(r => r.completed).length
        if (completedDays >= 14) {
          return NextResponse.json({ canCreateNew: true })
        }
      }
      
      return NextResponse.json(null)
    }

    // ユーザーの一日の始まり時間を取得
    const dayStartTime = await getUserDayStartTimeByEmail(user.email!)
    
    // 今日の日付を取得（一日の始まり時間を考慮）
    const today = getTodayInJST(dayStartTime)
    const todayStr = formatDateString(today)

    // 今日の記録を確認
    const todayRecord = habit.records.find(r => 
      r.date.toISOString().split('T')[0] === todayStr
    )

    // 開始日からの経過日数を計算
    const startDate = new Date(habit.startDate)
    startDate.setHours(0, 0, 0, 0)
    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1
    
    // 完了日数を計算（重複を除く、開始日以降の記録のみ）
    const uniqueCompletedDates = new Set()
    habit.records.forEach(record => {
      if (record.completed && record.date >= habit.startDate) {
        const dateStr = record.date.toISOString().split('T')[0]
        uniqueCompletedDates.add(dateStr)
      }
    })
    const completedDays = uniqueCompletedDates.size

    // 2日連続で未達成かチェック
    let shouldReset = false
    
    // 習慣開始から3日以上経過している場合のみチェック
    if (daysSinceStart >= 3) {
      // 直近2日間の日付を計算
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const dayBeforeYesterday = new Date(today.getTime() - 48 * 60 * 60 * 1000)
      
      const yesterdayStr = formatDateString(yesterday)
      const dayBeforeYesterdayStr = formatDateString(dayBeforeYesterday)
      
      // 各日の記録を確認
      const yesterdayRecord = habit.records.find(r => 
        r.date.toISOString().split('T')[0] === yesterdayStr
      )
      const dayBeforeRecord = habit.records.find(r => 
        r.date.toISOString().split('T')[0] === dayBeforeYesterdayStr
      )
      
      // 両日とも記録がない、または未達成の場合はリセット
      if ((!yesterdayRecord || !yesterdayRecord.completed) && 
          (!dayBeforeRecord || !dayBeforeRecord.completed)) {
        shouldReset = true
      }
    }

    return NextResponse.json({
      id: habit.id,
      title: habit.title,
      category: habit.category,
      startDate: habit.startDate.toISOString(),
      targetDays: habit.targetDays,
      completedDays,
      currentDay: Math.min(daysSinceStart, habit.targetDays), // 現在の日数（最大14日）
      records: habit.records.map(r => ({
        date: r.date.toISOString().split('T')[0],
        completed: r.completed
      })),
      todayCompleted: todayRecord?.completed || false,
      canCompleteToday: true,
      shouldReset,
      isCompleted: completedDays >= 14
    })
  } catch (error) {
    console.error('Error fetching habit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 新しい習慣を作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, category, targetDays } = body

    if (!title || !category) {
      return NextResponse.json({ error: 'Title and category are required' }, { status: 400 })
    }

    // 既存のアクティブな習慣があるか確認
    const activeHabit = await prisma.continuousHabit.findFirst({
      where: {
        userId: user.id,
        isActive: true
      }
    })

    if (activeHabit) {
      return NextResponse.json({ 
        error: 'アクティブな習慣が既に存在します。14日間達成してから新しい習慣を登録してください。' 
      }, { status: 400 })
    }


    // リセットされていない最新の習慣を確認
    const lastNonAbandonedHabit = await prisma.continuousHabit.findFirst({
      where: {
        userId: user.id,
        isActive: false
      },
      include: {
        records: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 最後の習慣がリセットされていない場合のみチェック
    if (lastNonAbandonedHabit) {
      // この習慣がリセットされたかどうか確認
      const wasAbandoned = await prisma.habitHistory.findFirst({
        where: {
          userId: user.id,
          title: lastNonAbandonedHabit.title,
          startDate: lastNonAbandonedHabit.startDate,
          status: 'abandoned'
        }
      })

      // HabitHistoryに完了記録があるかもチェック
      const wasCompleted = await prisma.habitHistory.findFirst({
        where: {
          userId: user.id,
          title: lastNonAbandonedHabit.title,
          startDate: lastNonAbandonedHabit.startDate,
          status: 'completed'
        }
      })

      // リセットされていない、かつ完了もしていない場合のみ14日間チェック
      if (!wasAbandoned && !wasCompleted) {
        const completedDays = lastNonAbandonedHabit.records.filter(r => r.completed).length
        if (completedDays < 14) {
          return NextResponse.json({ 
            error: '前の習慣を14日間達成してから新しい習慣を登録してください。' 
          }, { status: 400 })
        }
      }
    }

    // 新しい習慣を作成
    const habit = await prisma.continuousHabit.create({
      data: {
        title,
        category,
        targetDays: targetDays || 14,
        startDate: new Date(),
        userId: user.id,
        isActive: true
      }
    })

    return NextResponse.json(habit)
  } catch (error) {
    console.error('Error creating habit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}