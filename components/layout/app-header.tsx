interface AppHeaderProps {
  title: string
  leftAction?: React.ReactNode
  rightAction?: React.ReactNode
}

export function AppHeader({ title, leftAction, rightAction }: AppHeaderProps) {
  return (
    <header className="h-14 bg-white flex items-center justify-between px-5 border-b border-border">
      <div className="w-8 h-8 flex items-center justify-center">
        {leftAction}
      </div>
      <h1 className="flex-1 text-center text-lg font-medium tracking-tight">
        {title}
      </h1>
      <div className="w-8 h-8 flex items-center justify-center">
        {rightAction}
      </div>
    </header>
  )
}