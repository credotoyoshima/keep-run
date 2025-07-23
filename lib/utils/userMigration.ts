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

    if (existingUserByEmail && existingUserByEmail.id !== supabaseUserId) {
      // 古いユーザーが見つかった場合、データを移行
      console.log(`Migrating user data from ${existingUserByEmail.id} to ${supabaseUserId}`)
      
      try {
        // トランザクションで全ての操作を実行
        const result = await prisma.$transaction(async (tx) => {
          // 新しいユーザーを作成
          const newUser = await tx.user.create({
            data: {
              id: supabaseUserId,
              email: existingUserByEmail.email,
              name: existingUserByEmail.name,
              avatarUrl: existingUserByEmail.avatarUrl,
              dayStartTime: existingUserByEmail.dayStartTime,
              createdAt: existingUserByEmail.createdAt
            }
          })

          // ActiveDayの更新
          await tx.activeDay.updateMany({
            where: { userId: existingUserByEmail.id },
            data: { userId: supabaseUserId }
          })

          // Todoの更新
          await tx.todo.updateMany({
            where: { userId: existingUserByEmail.id },
            data: { userId: supabaseUserId }
          })

          // DailyEvaluationの更新
          await tx.dailyEvaluation.updateMany({
            where: { userId: existingUserByEmail.id },
            data: { userId: supabaseUserId }
          })

          // ContinuousHabitの更新
          await tx.continuousHabit.updateMany({
            where: { userId: existingUserByEmail.id },
            data: { userId: supabaseUserId }
          })

          // HabitHistoryの更新
          await tx.habitHistory.updateMany({
            where: { userId: existingUserByEmail.id },
            data: { userId: supabaseUserId }
          })

          // 古いユーザーレコードを削除
          await tx.user.delete({
            where: { id: existingUserByEmail.id }
          })

          return newUser
        })

        console.log(`User migration completed for ${email}`)
        return result
      } catch (migrationError) {
        console.error('Migration failed, returning existing user:', migrationError)
        // 移行に失敗した場合は既存のユーザーを返す
        return existingUserByEmail
      }
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