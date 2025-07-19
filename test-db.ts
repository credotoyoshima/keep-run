import { prisma } from './lib/prisma'

async function testDB() {
  try {
    console.log('Testing database connection...')
    
    // ユーザー数を確認
    const userCount = await prisma.user.count()
    console.log(`Total users: ${userCount}`)
    
    // 全ユーザーを表示
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        dayStartTime: true
      }
    })
    console.log('Users:', users)
    
    // ActiveDayのカウント
    const activeDayCount = await prisma.activeDay.count()
    console.log(`Total active days: ${activeDayCount}`)
    
  } catch (error) {
    console.error('Database error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDB()