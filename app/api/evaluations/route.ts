import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// 評価データを取得（過去31日分）
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // emailでユーザーを検索
    const userData = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true }
    })

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 31日前の日付を計算（日本時間基準）
    const now = new Date()
    const thirtyOneDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0)

    // 評価データを取得
    const evaluations = await prisma.dailyEvaluation.findMany({
      where: {
        userId: userData.id,
        date: {
          gte: thirtyOneDaysAgo
        }
      },
      orderBy: {
        date: 'desc'
      },
      select: {
        id: true,
        date: true,
        rating: true,
        comment: true
      }
    })

    // レスポンス用にデータを整形
    const formattedEvaluations = evaluations.map(evaluation => {
      // 日本時間での日付を取得
      const jstDate = new Date(evaluation.date)
      const year = jstDate.getUTCFullYear()
      const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0')
      const day = String(jstDate.getUTCDate()).padStart(2, '0')
      
      return {
        id: evaluation.id,
        date: `${year}-${month}-${day}`, // YYYY-MM-DD形式
        rating: evaluation.rating,
        comment: evaluation.comment || '',
        title: '' // 互換性のため空文字
      }
    })

    return NextResponse.json({ evaluations: formattedEvaluations })
  } catch (error) {
    console.error('Error fetching evaluations:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// 評価データを保存/更新
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { date, rating, comment } = body

    // バリデーション
    if (!date || !rating) {
      return NextResponse.json({ error: 'Date and rating are required' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // emailでユーザーを検索
    const userData = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true }
    })

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 日付をDateオブジェクトに変換（UTC日付として保存）
    const [yearInput, monthInput, dayInput] = date.split('-').map(Number)
    const dateObj = new Date(Date.UTC(yearInput, monthInput - 1, dayInput, 0, 0, 0, 0))

    // 既存の評価を検索
    const existingEvaluation = await prisma.dailyEvaluation.findFirst({
      where: {
        userId: userData.id,
        date: dateObj
      }
    })

    let result
    if (existingEvaluation) {
      // 更新
      result = await prisma.dailyEvaluation.update({
        where: { id: existingEvaluation.id },
        data: {
          rating,
          comment: comment || null
        }
      })
    } else {
      // 新規作成
      result = await prisma.dailyEvaluation.create({
        data: {
          userId: userData.id,
          date: dateObj,
          rating,
          comment: comment || null
        }
      })
    }

    // レスポンス用にデータを整形
    const jstDate = new Date(result.date)
    const yearResult = jstDate.getUTCFullYear()
    const monthResult = String(jstDate.getUTCMonth() + 1).padStart(2, '0')
    const dayResult = String(jstDate.getUTCDate()).padStart(2, '0')
    
    const formattedEvaluation = {
      id: result.id,
      date: `${yearResult}-${monthResult}-${dayResult}`,
      rating: result.rating,
      comment: result.comment || '',
      title: ''
    }

    return NextResponse.json({ evaluation: formattedEvaluation })
  } catch (error) {
    console.error('Error saving evaluation:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}