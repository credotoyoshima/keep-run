'use client'

import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface CreateHabitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

const categories = [
  { value: 'exercise', label: '運動', icon: '🏃' },
  { value: 'health', label: '健康', icon: '💪' },
  { value: 'learning', label: '学習', icon: '📚' },
  { value: 'other', label: 'その他', icon: '🎯' },
]

export function CreateHabitDialog({ open, onOpenChange, onCreated }: CreateHabitDialogProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [targetDays, setTargetDays] = useState('14')
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [reminderTime, setReminderTime] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!title.trim() || !category) return

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('ContinuousHabit')
      .insert({
        id: crypto.randomUUID(),
        title: title.trim(),
        category,
        startDate: startDate.toISOString(),
        targetDays: parseInt(targetDays),
        reminderTime: reminderTime || null,
        userId: user.id,
        updatedAt: new Date().toISOString(),
      })

    if (!error) {
      resetForm()
      onCreated()
      onOpenChange(false)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setTitle('')
    setCategory('')
    setTargetDays('14')
    setStartDate(new Date())
    setReminderTime('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新しい習慣</DialogTitle>
          <DialogDescription>
            継続したい習慣を登録します
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">習慣名 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="毎日散歩する"
            />
          </div>

          <div>
            <Label>カテゴリ *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center gap-2">
                      {cat.icon} {cat.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="targetDays">目標日数</Label>
            <Select value={targetDays} onValueChange={setTargetDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7日</SelectItem>
                <SelectItem value="14">14日</SelectItem>
                <SelectItem value="21">21日</SelectItem>
                <SelectItem value="30">30日</SelectItem>
                <SelectItem value="66">66日</SelectItem>
                <SelectItem value="100">100日</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>開始日</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, 'PPP', { locale: ja })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="reminderTime">リマインダー時刻（任意）</Label>
            <Input
              id="reminderTime"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !title.trim() || !category}>
            {loading ? '作成中...' : '作成'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}