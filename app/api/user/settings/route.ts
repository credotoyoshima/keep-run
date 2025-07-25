import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { safeGetOrCreateUser } from '@/lib/utils/safeUserMigration'

// GET /api/user/settings - ユーザー設定を取得
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーを取得または作成
    const dbUser = await safeGetOrCreateUser(user.id, user.email!)

    return NextResponse.json({
      dayStartTime: dbUser.dayStartTime
    })
  } catch (error) {
    console.error('Error fetching user settings:', error)
    // より詳細なエラーメッセージ（開発環境のみ）
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
      : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// PUT /api/user/settings - ユーザー設定を更新
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { dayStartTime } = body

    // バリデーション: HH:MM形式かチェック
    if (dayStartTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(dayStartTime)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM' },
        { status: 400 }
      )
    }

    // ユーザーを取得または作成
    const dbUser = await safeGetOrCreateUser(user.id, user.email!)
    
    // 設定を更新（実際のユーザーIDを使用）
    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        ...(dayStartTime !== undefined && { dayStartTime })
      },
      select: {
        dayStartTime: true
      }
    })

    return NextResponse.json({
      dayStartTime: updatedUser.dayStartTime,
      message: 'Settings updated successfully'
    })
  } catch (error) {
    console.error('Error updating user settings:', error)
    // より詳細なエラーメッセージ（開発環境のみ）
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
      : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

