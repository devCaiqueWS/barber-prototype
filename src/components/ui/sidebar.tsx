import { cn } from "@/lib/utils"

type SidebarProps = React.HTMLAttributes<HTMLElement>

export function Sidebar({ className, children, ...props }: SidebarProps) {
  return (
    <aside className={cn("premium-panel p-3", className)} {...props}>
      {children}
    </aside>
  )
}
