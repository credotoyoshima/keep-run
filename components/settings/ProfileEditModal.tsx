'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { User } from 'lucide-react'

interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setEmail(session.user.email || '')
        
        // データベースからユーザー情報を取得
        try {
          const response = await fetch('/api/user/profile')
          if (response.ok) {
            const data = await response.json()
            setName(data.name || '')
          }
        } catch (error) {
          console.error('Error fetching user profile:', error)
        }
      }
    }
    
    if (isOpen) {
      fetchUser()
    }
  }, [isOpen, supabase])

  const handleSave = async () => {
    setLoading(true)
    setMessage('')

    try {
      // データベースに保存
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      })

      if (response.ok) {
        setMessage('プロフィールを更新しました')
        // 設定ページをリロードして名前を更新
        window.location.reload()
      } else {
        setMessage('更新に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>プロフィール編集</DialogTitle>
          <DialogDescription>
            ユーザー名を変更できます
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center">
              <User className="h-10 w-10 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">ユーザー名</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ユーザー名を入力"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="bg-gray-50"
            />
          </div>

          {message && (
            <div className={`text-sm ${message.includes('失敗') || message.includes('エラー') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button
            className="flex-1 bg-black hover:bg-gray-800 text-white"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? '保存中...' : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}