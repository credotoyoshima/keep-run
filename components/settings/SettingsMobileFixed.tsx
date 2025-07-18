'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { ProfileEditModal } from './ProfileEditModal'
import { DayStartTimeModal } from './DayStartTimeModal'
import { ResetHabitModal } from './ResetHabitModal'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useDayStartTime } from '@/lib/hooks/useDayStartTime'
import { 
  User, 
  LogOut,
  ChevronRight,
  Clock,
  RefreshCw
} from 'lucide-react'

export function SettingsMobile() {
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showResetHabitModal, setShowResetHabitModal] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState<string | null>(null)
  const [showDayStartModal, setShowDayStartModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()
  const { dayStartTime, updateDayStartTime } = useDayStartTime()

  useEffect(() => {
    const fetchUserData = async () => {
      // Supabaseから直接ユーザー情報を取得
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUserEmail(user.email || '')
        
        // データベースからユーザー情報を取得
        try {
          const response = await fetch('/api/user/profile')
          if (response.ok) {
            const data = await response.json()
            setUserName(data.name || 'ユーザー')
          } else {
            setUserName('ユーザー')
          }
        } catch (error) {
          console.error('Error fetching user profile:', error)
          setUserName('ユーザー')
        }
      }
      setIsLoading(false)
    }
    
    fetchUserData()
  }, []) // 初回マウント時のみ実行

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // プロフィールモーダルを閉じる時に名前を更新
  const handleCloseProfileModal = async () => {
    setShowProfileModal(false)
    // APIから最新の名前を取得
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setUserName(data.name || 'ユーザー')
      }
    } catch (error) {
      console.error('Error fetching updated profile:', error)
    }
  }

  // 一日の始まり時間を保存
  const handleSaveDayStartTime = async (time: string) => {
    const result = await updateDayStartTime(time)
    if (!result.success) {
      alert('設定の保存に失敗しました。もう一度お試しください。')
    }
  }

  const settingsGroups = [
    {
      title: '設定',
      items: [
        {
          icon: User,
          label: 'プロフィール',
          description: 'ユーザー情報の編集',
          action: () => setShowProfileModal(true)
        },
        {
          icon: Clock,
          label: '一日の始まり時間',
          description: dayStartTime,
          action: () => setShowDayStartModal(true)
        },
        {
          icon: RefreshCw,
          label: '習慣をリセット',
          description: '新たな習慣を再設定',
          action: () => setShowResetHabitModal(true)
        }
      ]
    }
  ]

  return (
    <MobileLayout title="設定">
      <div className="p-5 pb-0">
      {/* User Profile Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-10 w-10 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 mb-1 truncate">
              {isLoading ? (
                <span className="inline-block h-6 w-32 bg-gray-200 rounded animate-pulse"></span>
              ) : (
                userName || 'ユーザー'
              )}
            </h2>
            <p className="text-sm text-gray-500 truncate">
              {isLoading ? (
                <span className="inline-block h-4 w-48 bg-gray-200 rounded animate-pulse"></span>
              ) : (
                userEmail
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Settings Groups */}
      <div className="space-y-4 mb-20">
        {settingsGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {group.items.map((item, itemIndex) => (
                <div 
                  key={itemIndex}
                  className={`flex items-center justify-between p-4 ${
                    itemIndex < group.items.length - 1 ? 'border-b border-gray-100' : ''
                  } cursor-pointer hover:bg-gray-50`}
                  onClick={item.action}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">
                        {item.label}
                      </div>
                      <div className="text-xs text-gray-500 font-light">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
            ))}
          </div>
        ))}

        {/* Logout Section */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4 text-red-600 hover:bg-red-50 transition-colors"
            onClick={handleLogout}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <LogOut className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">ログアウト</div>
                <div className="text-xs text-red-500 font-light">アカウントからサインアウト</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-red-400" />
          </button>
        </div>

        {/* App Info */}
        <div className="text-center py-6">
          <div className="text-sm text-gray-500 font-light">
            Keep Run v1.0.0
          </div>
          <div className="text-xs text-gray-400 mt-1">
            継続的な成長のためのタスク管理ツール
          </div>
        </div>
      </div>
    </div>

    {/* Modals */}
    <ProfileEditModal
      isOpen={showProfileModal}
      onClose={handleCloseProfileModal}
    />
    <DayStartTimeModal
      isOpen={showDayStartModal}
      onClose={() => setShowDayStartModal(false)}
      currentTime={dayStartTime}
      onSave={handleSaveDayStartTime}
    />
    <ResetHabitModal
      isOpen={showResetHabitModal}
      onClose={() => setShowResetHabitModal(false)}
    />
    </MobileLayout>
  )
}