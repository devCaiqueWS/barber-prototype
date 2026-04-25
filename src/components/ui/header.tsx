import Link from "next/link"

import { cn } from "@/lib/utils"

type HeaderProps = {
  title?: string
  subtitle?: string
  className?: string
  children?: React.ReactNode
}

export function Header({
  title = "Elemento Estúdio e Barbearia",
  subtitle,
  className,
  children,
}: HeaderProps) {
  return (
    <header className={cn("bg-[#0d0b0b]", className)}>
      <div className="container flex items-center justify-between gap-4 py-4">
        <Link href="/" className="flex min-w-0 items-center">
          <span className="min-w-0">
            <span className="brand-wordmark block truncate text-3xl font-bold text-primary md:text-4xl">{title}</span>
            {subtitle && <span className="block truncate text-xs text-white/55">{subtitle}</span>}
          </span>
        </Link>
        {children}
      </div>
    </header>
  )
}
