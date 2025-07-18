'use client'

import { useState, useEffect } from 'react'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Plus, FileText } from 'lucide-react'
import { Database } from '@/lib/supabase/types'

type DayTemplate = Database['public']['Tables']['DayTemplate']['Row']
type TemplateTimeBlock = Database['public']['Tables']['TemplateTimeBlock']['Row']
type TemplateTask = Database['public']['Tables']['TemplateTask']['Row']

type DayTemplateWithBlocks = DayTemplate & {
  timeBlocks: (TemplateTimeBlock & {
    tasks: TemplateTask[]
  })[]
}

interface CreateActiveDayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function CreateActiveDayDialog({ open, onOpenChange, onCreated }: CreateActiveDayDialogProps) {
  const [templates, setTemplates] = useState<DayTemplateWithBlocks[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [fetchingTemplates, setFetchingTemplates] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      fetchTemplates()
    }
  }, [open])

  const fetchTemplates = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('DayTemplate')
      .select(`
        *,
        timeBlocks:TemplateTimeBlock(
          *,
          tasks:TemplateTask(*)
        )
      `)
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })

    if (!error && data) {
      setTemplates(data as DayTemplateWithBlocks[])
    }
    setFetchingTemplates(false)
  }

  const createFromTemplate = async (template: DayTemplateWithBlocks) => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toISOString().split('T')[0]

    const { data: activeDay, error: activeDayError } = await supabase
      .from('ActiveDay')
      .insert({
        id: crypto.randomUUID(),
        date: today,
        userId: user.id,
        templateId: template.id,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (activeDayError || !activeDay) {
      setLoading(false)
      return
    }

    for (let i = 0; i < template.timeBlocks.length; i++) {
      const templateBlock = template.timeBlocks[i]
      const { data: activeBlock, error: blockError } = await supabase
        .from('ActiveTimeBlock')
        .insert({
          id: crypto.randomUUID(),
          title: templateBlock.title,
          startTime: templateBlock.startTime,
          orderIndex: templateBlock.orderIndex,
          completionRate: 0,
          dayId: activeDay.id,
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single()

      if (!blockError && activeBlock) {
        for (const templateTask of templateBlock.tasks) {
          await supabase
            .from('ActiveTask')
            .insert({
              id: crypto.randomUUID(),
              title: templateTask.title,
              completed: false,
              orderIndex: templateTask.orderIndex,
              blockId: activeBlock.id,
              updatedAt: new Date().toISOString(),
            })
        }
      }
    }

    setLoading(false)
    onCreated()
    onOpenChange(false)
  }

  const createEmptyDay = async () => {
    setLoading(true)
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

    setLoading(false)
    onCreated()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>今日の予定を作成</DialogTitle>
          <DialogDescription>
            テンプレートから作成するか、空の予定から始めることができます
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {fetchingTemplates ? (
            <div>テンプレートを読み込み中...</div>
          ) : (
            <>
              <Card className="cursor-pointer hover:bg-gray-50" onClick={createEmptyDay}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    空の予定から開始
                  </CardTitle>
                  <CardDescription>
                    タイムブロックを手動で追加して予定を作成します
                  </CardDescription>
                </CardHeader>
              </Card>

              {templates.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">テンプレートから作成</Label>
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <Card 
                        key={template.id} 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => createFromTemplate(template)}
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {template.name}
                          </CardTitle>
                          <CardDescription>
                            {template.timeBlocks.length} 個のタイムブロック • {' '}
                            {template.timeBlocks.reduce((total, block) => total + block.tasks.length, 0)} 個のタスク
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground">
                            {template.timeBlocks.slice(0, 3).map((block, index) => (
                              <div key={block.id}>
                                {block.startTime} - {block.title}
                              </div>
                            ))}
                            {template.timeBlocks.length > 3 && (
                              <div>他 {template.timeBlocks.length - 3} 個のブロック</div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}