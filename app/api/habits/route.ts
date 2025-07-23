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

    // 今日の記録を確認（修正：正確な日付比較）
    const todayRecord = habit.records.find(r => {
      const recordDateStr = formatDateString(new Date(r.date))
      return recordDateStr === todayStr
    })

    // 開始日からの経過日数を計算（日本時間基準）
    const jstOptions = { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' } as const
    const todayJST = new Date(today.toLocaleDateString('en-CA', jstOptions))
    const startDateJST = new Date(habit.startDate.toLocaleDateString('en-CA', jstOptions))
    const daysSinceStart = Math.floor((todayJST.getTime() - startDateJST.getTime()) / (24 * 60 * 60 * 1000)) + 1
    
    // 完了日数を計算（重複を除く、開始日以降の記録のみ）
    const uniqueCompletedDates = new Set()
    console.log('[DEBUG API GET] Calculating completedDays for habit:', {
      habitId: habit.id,
      startDate: habit.startDate.toISOString(),
      totalRecords: habit.records.length
    })
    
    habit.records.forEach(record => {
      console.log('[DEBUG API GET] Processing record:', {
        date: record.date.toISOString(),
        completed: record.completed,
        isAfterStartDate: record.date >= habit.startDate
      })
      
      if (record.completed) {
        // 開始日以降の記録のみカウント（日付比較を修正）
        const recordDate = new Date(record.date)
        const startDate = new Date(habit.startDate)
        
        // 日本時間基準で時刻をリセットして日付のみで比較
        const recordDateJST = new Date(recordDate.toLocaleDateString('en-CA', jstOptions))
        const startDateJSTForComparison = new Date(startDate.toLocaleDateString('en-CA', jstOptions))
        
        if (recordDateJST >= startDateJSTForComparison) {
          const dateStr = formatDateString(recordDate)
          console.log('[DEBUG API GET] Adding to uniqueCompletedDates:', dateStr)
          uniqueCompletedDates.add(dateStr)
        } else {
          console.log('[DEBUG API GET] Record before start date, skipping:', {
            recordDate: recordDate.toISOString(),
            startDate: startDate.toISOString(),
            recordDateJST: recordDateJST.toISOString(),
            startDateJST: startDateJSTForComparison.toISOString()
          })
        }
      }
    })
    
    const completedDays = uniqueCompletedDates.size
    console.log('[DEBUG API GET] Final calculation:', {
      uniqueCompletedDates: Array.from(uniqueCompletedDates),
      completedDays
    })

    // 2日連続で未達成かチェック
    let shouldReset = false
    
    // 習慣開始から3日以上経過している場合のみチェック
    if (daysSinceStart >= 3) {
      // 直近2日間の日付を計算
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const dayBeforeYesterday = new Date(today.getTime() - 48 * 60 * 60 * 1000)
      
      const yesterdayStr = formatDateString(yesterday)
      const dayBeforeYesterdayStr = formatDateString(dayBeforeYesterday)
      
      // 各日の記録を確認（修正：統一した日付比較）
      const yesterdayRecord = habit.records.find(r => 
        formatDateString(new Date(r.date)) === yesterdayStr
      )
      const dayBeforeRecord = habit.records.find(r => 
        formatDateString(new Date(r.date)) === dayBeforeYesterdayStr
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