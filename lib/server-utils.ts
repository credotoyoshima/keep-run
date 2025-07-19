import { prisma } from '@/lib/prisma'

/**
 * ユーザーのdayStartTime設定を取得する
 * @param userId ユーザーID
 * @returns dayStartTime（デフォルト: "05:00"）
 */
export async function getUserDayStartTime(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dayStartTime: true }
    })
    
    return user?.dayStartTime || '05:00'
  } catch (error) {
    console.error('Error fetching user dayStartTime:', error)
    return '05:00' // デフォルト値を返す
  }
}

/**
 * メールアドレスからユーザーのdayStartTime設定を取得する
 * ユーザーが存在しない場合は作成する
 * @param email ユーザーのメールアドレス
 * @returns dayStartTime（デフォルト: "05:00"）
 */
export async function getUserDayStartTimeByEmail(email: string): Promise<string> {
  try {
    // ユーザーが存在しない場合は作成
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: null,
        avatarUrl: null,
        dayStartTime: '05:00'
      },
      select: { dayStartTime: true }
    })
    
    return user?.dayStartTime || '05:00'
  } catch (error) {
    console.error('Error fetching user dayStartTime by email:', error)
    return '05:00' // デフォルト値を返す
  }
}

/**
 * Supabaseのユーザー情報からPrismaのユーザーを取得または作成
 * @param email ユーザーのメールアドレス
 * @returns Prismaのユーザー
 */
export async function getOrCreateUserByEmail(email: string) {
  return await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: null,
      avatarUrl: null,
      dayStartTime: '05:00'
    }
  })
}