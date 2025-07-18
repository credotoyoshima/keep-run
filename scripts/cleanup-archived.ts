#!/usr/bin/env node
/**
 * アーカイブデータのクリーンアップスクリプト
 * 
 * 使用方法:
 * 1. 手動実行: npx tsx scripts/cleanup-archived.ts
 * 2. cronで定期実行: 0 2 * * * cd /path/to/keep-run && npx tsx scripts/cleanup-archived.ts
 */

import { prisma } from '../lib/prisma'

async function cleanupArchivedData() {
  console.log('Starting archived data cleanup...')
  
  try {
    // 90日前の日付を計算
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    console.log(`Cleaning up data archived before: ${ninetyDaysAgo.toISOString()}`)

    // 1. アーカイブされたToDoを削除
    const deletedTodos = await prisma.todo.deleteMany({
      where: {
        archived: true,
        updatedAt: {
          lt: ninetyDaysAgo
        }
      }
    })
    console.log(`Deleted ${deletedTodos.count} archived todos`)

    // 2. アーカイブされたActiveTaskを削除
    const deletedActiveTasks = await prisma.activeTask.deleteMany({
      where: {
        archived: true,
        updatedAt: {
          lt: ninetyDaysAgo
        }
      }
    })
    console.log(`Deleted ${deletedActiveTasks.count} archived active tasks`)

    // 3. アーカイブされたActiveTimeBlockとその関連タスクを削除
    const archivedBlocks = await prisma.activeTimeBlock.findMany({
      where: {
        archived: true,
        updatedAt: {
          lt: ninetyDaysAgo
        }
      },
      select: { id: true }
    })

    if (archivedBlocks.length > 0) {
      const blockIds = archivedBlocks.map(block => block.id)
      
      // 関連するタスクを削除
      const deletedRelatedTasks = await prisma.activeTask.deleteMany({
        where: {
          blockId: {
            in: blockIds
          }
        }
      })
      console.log(`Deleted ${deletedRelatedTasks.count} tasks related to archived blocks`)

      // ブロック自体を削除
      const deletedBlocks = await prisma.activeTimeBlock.deleteMany({
        where: {
          id: {
            in: blockIds
          }
        }
      })
      console.log(`Deleted ${deletedBlocks.count} archived time blocks`)
    }

    // 4. 古いルーティン完了記録を削除
    const deletedRoutineCompletions = await prisma.todoRoutineCompletion.deleteMany({
      where: {
        completedDate: {
          lt: ninetyDaysAgo
        }
      }
    })
    console.log(`Deleted ${deletedRoutineCompletions.count} old routine completions`)

    // 5. 空のActiveDayを削除
    const emptyDays = await prisma.activeDay.findMany({
      where: {
        date: {
          lt: ninetyDaysAgo
        },
        timeBlocks: {
          none: {}
        }
      },
      select: { id: true }
    })

    if (emptyDays.length > 0) {
      const deletedDays = await prisma.activeDay.deleteMany({
        where: {
          id: {
            in: emptyDays.map(day => day.id)
          }
        }
      })
      console.log(`Deleted ${deletedDays.count} empty active days`)
    }

    console.log('Cleanup completed successfully!')
  } catch (error) {
    console.error('Error during cleanup:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// スクリプトを実行
cleanupArchivedData().catch(console.error)