import { Header } from "@/components/ui/header"
import { cn } from "@/lib/utils"

type DashboardLayoutProps = {
  title: string
  subtitle?: string
  userLabel?: string
  actions?: React.ReactNode
  navigation?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function DashboardLayout({
  title,
  subtitle,
  userLabel,
  actions,
  navigation,
  children,
  className,
}: DashboardLayoutProps) {
  return (
    <div className={cn("premium-shell text-white", className)}>
      <Header title={title} subtitle={subtitle}>
        <div className="flex items-center gap-3">
          {userLabel && <span className="hidden text-right text-xs text-white/60 sm:block">{userLabel}</span>}
          {actions}
        </div>
      </Header>
      <main className="container py-6">
        {navigation}
        {children}
      </main>
    </div>
  )
}
