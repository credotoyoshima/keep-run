import { prisma } from '@/lib/prisma'

// キャッシュを追加してパフォーマンス向上
const userCache = new Map<string, any>()

/**
 * より安全なユーザーデータ移行処理
 * エラーが発生しても既存の動作を維持
 */
export async function safeGetOrCreateUser(supabaseUserId: string, email: string) {
  // キャッシュチェック
  const cacheKey = `${supabaseUserId}-${email}`
  if (userCache.has(cacheKey)) {
    return userCache.get(cacheKey)
  }

  try {
    // 1. まず、Supabase AuthのIDで検索
    const existingUser = await prisma.user.findUnique({
      where: { id: supabaseUserId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        dayStartTime: true
      }
    })

    if (existingUser) {
      userCache.set(cacheKey, existingUser)
      return existingUser
    }

    // 2. IDで見つからない場合、新規作成を試みる
    try {
      const newUser = await prisma.user.create({
        data: {
          id: supabaseUserId,
          email,
          name: null,
          avatarUrl: null,
          dayStartTime: '05:00'
        }
      })
      userCache.set(cacheKey, newUser)
      return newUser
    } catch (createError: any) {
      // Unique constraint violationの場合（emailが既に使われている）
      if (createError.code === 'P2002' && createError.meta?.target?.includes('email')) {
        console.log(`Email ${email} already exists with different ID, attempting to find by email`)
        
        // 3. emailで既存ユーザーを検索
        const userByEmail = await prisma.user.findUnique({
          where: { email }
        })
        
        if (userByEmail) {
          console.log(`Found existing user with email ${email}, ID: ${userByEmail.id}`)
          // 既存のユーザーをそのまま返す（移行は行わない）
          userCache.set(cacheKey, userByEmail)
          return userByEmail
        }
      }
      
      throw createError
    }
  } catch (error) {
    console.error('Error in safeGetOrCreateUser:', error)
    throw error
  }
}