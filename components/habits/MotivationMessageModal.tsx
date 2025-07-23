'use client'

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

interface MotivationMessageModalProps {
  isOpen: boolean
  message: string
  isResetMessage?: boolean
  onClose: () => void
}

export function MotivationMessageModal({
  isOpen,
  message,
  isResetMessage = false,
  onClose
}: MotivationMessageModalProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className={`
          ${isResetMessage ? 'max-w-sm' : 'max-w-xs'} 
          bg-white border ${isResetMessage ? 'border-gray-300' : 'border-gray-200'}
          rounded-lg p-6 shadow-sm
        `}
      >
        <VisuallyHidden>
          <DialogTitle>
            {isResetMessage ? 'リセットメッセージ' : 'モチベーションメッセージ'}
          </DialogTitle>
        </VisuallyHidden>
        
        <div className="text-center">
          {/* メッセージ */}
          <div className={`
            ${isResetMessage ? 'text-gray-800' : 'text-gray-900'}
            font-medium whitespace-pre-wrap
            ${isResetMessage ? 'text-sm' : 'text-base'}
          `}>
            {message}
          </div>
          
          {/* 閉じるボタン */}
          <Button
            onClick={onClose}
            className={`
              mt-6 w-full rounded font-medium
              bg-black hover:bg-gray-800 text-white
              transition-colors duration-200
            `}
          >
            {isResetMessage ? 'もう一度挑戦する' : 'OK'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}