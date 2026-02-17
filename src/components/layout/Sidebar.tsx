"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboardIcon,
  BarChart2Icon,
  AtSignIcon,
  UsersIcon,
  BrainIcon,
  CreditCardIcon,
  SettingsIcon,
  TrendingUpIcon,
  PenLineIcon,
  BellIcon,
  ZapIcon,
  LogOutIcon,
  ChevronRightIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { UserButton } from "@clerk/nextjs"

const navItems = [
  {
    group: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
      { href: "/dashboard/alerts", label: "Alerts", icon: BellIcon, badge: "Live" },
    ],
  },
  {
    group: "Analytics",
    items: [
      { href: "/dashboard/analytics", label: "Twitter Analytics", icon: BarChart2Icon },
      { href: "/dashboard/competitors", label: "Competitors", icon: TrendingUpIcon },
      { href: "/dashboard/mentions", label: "Community", icon: AtSignIcon },
    ],
  },
  {
    group: "Creator Tools",
    items: [
      { href: "/dashboard/content", label: "Content Studio", icon: PenLineIcon },
      { href: "/dashboard/crm", label: "Creator CRM", icon: UsersIcon },
      { href: "/dashboard/agents", label: "Agents", icon: BrainIcon, badge: "AI" },
    ],
  },
  {
    group: "Account",
    items: [
      { href: "/dashboard/billing", label: "Billing", icon: CreditCardIcon },
      { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen border-r bg-card/50 backdrop-blur sticky top-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-orange-500 flex items-center justify-center">
            <ZapIcon className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">CryptoScope</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navItems.map((group) => (
          <div key={group.group}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-1.5">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-orange-500/15 text-orange-500"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold bg-orange-500/20 text-orange-500 px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRightIcon className="h-3 w-3 opacity-50" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t p-4 flex items-center gap-3">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">My Account</p>
          <p className="text-xs text-muted-foreground truncate">CryptoScope</p>
        </div>
      </div>
    </aside>
  )
}
