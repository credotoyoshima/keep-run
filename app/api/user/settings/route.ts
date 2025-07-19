import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/user/settings - ユーザー設定を取得
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーが存在しない場合は作成
    const dbUser = await prisma.user.upsert({
      where: { email: user.email! },
      update: {},
      create: {
        email: user.email!,
        name: user.user_metadata?.name || null,
        avatarUrl: user.user_metadata?.avatar_url || null
      }
    })

    return NextResponse.json({
      dayStartTime: dbUser.dayStartTime
    })
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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

    // ユーザーが存在しない場合は作成、存在する場合は更新
    const updatedUser = await prisma.user.upsert({
      where: { email: user.email! },
      update: {
        ...(dayStartTime !== undefined && { dayStartTime })
      },
      create: {
        email: user.email!,
        name: user.user_metadata?.name || null,
        avatarUrl: user.user_metadata?.avatar_url || null,
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

