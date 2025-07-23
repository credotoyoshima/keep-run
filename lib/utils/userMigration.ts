import { prisma } from '@/lib/prisma'

/**
 * 既存のユーザーデータをSupabase AuthのユーザーIDに移行する
 * @param supabaseUserId Supabase AuthのユーザーID
 * @param email ユーザーのメールアドレス
 * @returns 移行または取得したユーザー
 */
export async function migrateOrGetUser(supabaseUserId: string, email: string) {
  try {
    // まず、Supabase AuthのIDで検索
    let user = await prisma.user.findUnique({
      where: { id: supabaseUserId }
    })

    if (user) {
      return user
    }

    // 次に、メールアドレスで検索（古いデータ）
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUserByEmail) {
      // 古いユーザーが見つかった場合、新しいユーザーを作成してデータを移行
      console.log(`Migrating user data from ${existingUserByEmail.id} to ${supabaseUserId}`)
      
      // 新しいユーザーを作成
      user = await prisma.user.create({
        data: {
          id: supabaseUserId,
          email: existingUserByEmail.email,
          name: existingUserByEmail.name,
          avatarUrl: existingUserByEmail.avatarUrl,
          dayStartTime: existingUserByEmail.dayStartTime,
          createdAt: existingUserByEmail.createdAt
        }
      })

      // 関連データを新しいユーザーIDに更新
      await prisma.$transaction([
        // ActiveDayの更新
        prisma.activeDay.updateMany({
          where: { userId: existingUserByEmail.id },
          data: { userId: supabaseUserId }
        }),
        // Todoの更新
        prisma.todo.updateMany({
          where: { userId: existingUserByEmail.id },
          data: { userId: supabaseUserId }
        }),
        // DailyEvaluationの更新
        prisma.dailyEvaluation.updateMany({
          where: { userId: existingUserByEmail.id },
          data: { userId: supabaseUserId }
        }),
        // ContinuousHabitの更新
        prisma.continuousHabit.updateMany({
          where: { userId: existingUserByEmail.id },
          data: { userId: supabaseUserId }
        }),
        // HabitHistoryの更新
        prisma.habitHistory.updateMany({
          where: { userId: existingUserByEmail.id },
          data: { userId: supabaseUserId }
        }),
        // 古いユーザーレコードを削除
        prisma.user.delete({
          where: { id: existingUserByEmail.id }
        })
      ])

      console.log(`User migration completed for ${email}`)
      return user
    }

    // どちらも見つからない場合は新規作成
    user = await prisma.user.create({
      data: {
        id: supabaseUserId,
        email,
        name: null,
        avatarUrl: null,
        dayStartTime: '05:00'
      }
    })

    return user
  } catch (error) {
    console.error('Error in migrateOrGetUser:', error)
    throw error
  }
}