import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, userId } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // userIdが直接渡された場合（新規登録フロー）
    if (userId) {
      // Prismaを使ってユーザーレコードを作成
      try {
        const newUser = await prisma.user.create({
          data: {
            id: userId,
            email: email,
            name: name || null,
            dayStartTime: '05:00' // デフォルト値
          }
        })

        return NextResponse.json({ 
          success: true, 
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name
          }
        })
      } catch (error) {
        // ユーザーが既に存在する場合
        if (error instanceof Error && error.message.includes('Unique constraint')) {
          const existingUser = await prisma.user.findUnique({
            where: { id: userId }
          })
          
          if (existingUser) {
            return NextResponse.json({ 
              success: true, 
              user: {
                id: existingUser.id,
                email: existingUser.email,
                name: existingUser.name
              }
            })
          }
        }
        
        console.error('Error creating user record:', error)
        return NextResponse.json({ 
          error: 'Failed to create user record',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // 既存のフロー（認証済みユーザー）
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    // Prismaを使ってユーザーレコードを作成
    try {
      const newUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email!,
          name: name || null,
          dayStartTime: '05:00' // デフォルト値
        }
      })

      return NextResponse.json({ 
        success: true, 
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name
        }
      })
    } catch (error) {
      // ユーザーが既に存在する場合
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        const existingUser = await prisma.user.findUnique({
          where: { id: user.id }
        })
        
        if (existingUser) {
          return NextResponse.json({ 
            success: true, 
            user: {
              id: existingUser.id,
              email: existingUser.email,
              name: existingUser.name
            }
          })
        }
      }
      
      console.error('Error creating user record:', error)
      return NextResponse.json({ 
        error: 'Failed to create user record',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in signup route:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}