'use client'

import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface CreateActiveDayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function CreateActiveDayDialog({ open, onOpenChange, onCreated }: CreateActiveDayDialogProps) {
  const supabase = createClient()

  const createEmptyDay = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toISOString().split('T')[0]

    await supabase
      .from('ActiveDay')
      .insert({
        id: crypto.randomUUID(),
        date: today,
        userId: user.id,
        templateId: null,
        updatedAt: new Date().toISOString(),
      })

    onCreated()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>今日の予定を作成</DialogTitle>
          <DialogDescription>
            新しい予定を作成して、タイムブロックを追加できます
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            「作成」ボタンをクリックすると、今日の空の予定が作成されます。
            その後、タイムブロックとタスクを自由に追加できます。
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={createEmptyDay}>
            作成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}