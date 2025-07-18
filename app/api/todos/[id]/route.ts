import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDateForDayStart } from '@/lib/date-utils'
import { getUserDayStartTimeByEmail } from '@/lib/server-utils'

// ToDoを更新
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const todoId = params.id
    const body = await request.json()

    // ユーザーが所有するToDoか確認
    const existingTodo = await prisma.todo.findFirst({
      where: {
        id: todoId,
        userId: user.id
      }
    })

    if (!existingTodo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
    }

    // タスクタイプを変更する場合の処理
    if (body.taskType !== undefined && body.taskType !== existingTodo.taskType) {
      if (body.taskType === 'spot' && existingTodo.taskType === 'routine') {
        // ルーティン→スポットに変更する場合、ルーティン完了記録を削除
        await prisma.todoRoutineCompletion.deleteMany({
          where: { todoId: todoId }
        })
      }
    }

    // ルーティンタスクの完了状態を特別に処理
    if ((existingTodo.taskType === 'routine' || body.taskType === 'routine') && body.completed !== undefined) {
      // ユーザーの一日の始まり時間を取得
      const dayStartTime = await getUserDayStartTimeByEmail(user.email!)

      // 現在の日付（一日の始まりの時間を考慮）
      const currentDate = getDateForDayStart(new Date(), dayStartTime)
      const dateStr = currentDate.toISOString().split('T')[0]

      if (body.completed) {
        // 完了にする場合、今日の完了記録を作成
        await prisma.todoRoutineCompletion.upsert({
          where: {
            todoId_completedDate: {
              todoId: todoId,
              completedDate: new Date(dateStr)
            }
          },
          update: {},
          create: {
            todoId: todoId,
            completedDate: new Date(dateStr)
          }
        })
      } else {
        // 未完了にする場合、今日の完了記録を削除
        await prisma.todoRoutineCompletion.deleteMany({
          where: {
            todoId: todoId,
            completedDate: {
              gte: new Date(dateStr),
              lt: new Date(dateStr + 'T23:59:59.999Z')
            }
          }
        })
      }

      // ルーティンタスクの場合、completedフィールドは更新しない
      const updateData: any = {}
      if (body.title !== undefined) updateData.title = body.title
      if (body.description !== undefined) updateData.description = body.description
      if (body.taskType !== undefined) updateData.taskType = body.taskType
      if (body.important !== undefined) updateData.important = body.important
      if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
      if (body.archived !== undefined) updateData.archived = body.archived

      const updatedTodo = await prisma.todo.update({
        where: { id: todoId },
        data: updateData
      })

      // 今日の完了状態を含めて返す
      const routineCompletions = await prisma.todoRoutineCompletion.findMany({
        where: {
          todoId: todoId,
          completedDate: {
            gte: new Date(dateStr),
            lt: new Date(dateStr + 'T23:59:59.999Z')
          }
        }
      })

      return NextResponse.json({
        ...updatedTodo,
        completed: routineCompletions.length > 0
      })
    }

    // スポットタスクの場合は通常通り処理
    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.completed !== undefined) updateData.completed = body.completed
    if (body.taskType !== undefined) updateData.taskType = body.taskType
    if (body.important !== undefined) updateData.important = body.important
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
    if (body.archived !== undefined) updateData.archived = body.archived

    const updatedTodo = await prisma.todo.update({
      where: { id: todoId },
      data: updateData
    })

    return NextResponse.json(updatedTodo)
  } catch (error) {
    console.error('Error updating todo:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ToDoを削除
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const todoId = params.id

    // ユーザーが所有するToDoか確認
    const existingTodo = await prisma.todo.findFirst({
      where: {
        id: todoId,
        userId: user.id
      }
    })

    if (!existingTodo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
    }

    // 物理削除ではなく、アーカイブとして扱う
    const archivedTodo = await prisma.todo.update({
      where: { id: todoId },
      data: { archived: true }
    })

    return NextResponse.json({ success: true, todo: archivedTodo })
  } catch (error) {
    console.error('Error deleting todo:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}