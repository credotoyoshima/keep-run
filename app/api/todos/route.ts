import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDateForDayStart } from '@/lib/date-utils'
import { getUserDayStartTimeByEmail } from '@/lib/server-utils'

// ToDoリストを取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーの一日の始まり時間を取得
    const dayStartTime = await getUserDayStartTimeByEmail(user.email!)

    // 現在の日付（一日の始まりの時間を考慮）
    const currentDate = getDateForDayStart(new Date(), dayStartTime)
    const dateStr = currentDate.toISOString().split('T')[0]

    // アーカイブされていないToDoを取得
    const todos = await prisma.todo.findMany({
      where: {
        userId: user.id,
        archived: false
      },
      include: {
        routineCompletions: {
          where: {
            completedDate: {
              gte: new Date(dateStr),
              lt: new Date(dateStr + 'T23:59:59.999Z')
            }
          }
        }
      },
      orderBy: [
        { completed: 'asc' },  // 未完了を先に表示
        { createdAt: 'asc' }   // 古いものを先に表示（新しいものは下に追加）
      ]
    })

    // ルーティンタスクの完了状態を調整
    const todosWithRoutineStatus = todos.map(todo => {
      if (todo.taskType === 'routine') {
        // ルーティンタスクの場合、今日の完了記録があるかチェック
        const isCompletedToday = todo.routineCompletions.length > 0
        return {
          ...todo,
          completed: isCompletedToday,
          routineCompletions: undefined // クライアントに不要な情報を送らない
        }
      }
      // スポットタスクはそのまま
      return {
        ...todo,
        routineCompletions: undefined
      }
    })

    return NextResponse.json(todosWithRoutineStatus)
  } catch (error) {
    console.error('Error fetching todos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 新しいToDoを作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, dueDate, taskType, important } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const todo = await prisma.todo.create({
      data: {
        title,
        description: description || null,
        taskType: taskType || 'spot',
        important: important || false,
        dueDate: dueDate ? new Date(dueDate) : null,
        userId: user.id
      }
    })

    return NextResponse.json(todo)
  } catch (error) {
    console.error('Error creating todo:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}