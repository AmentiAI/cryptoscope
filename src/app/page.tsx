import Link from "next/link"
import {
  ZapIcon,
  TrendingUpIcon,
  UsersIcon,
  BrainIcon,
  BarChart2Icon,
  ShieldIcon,
  CheckIcon,
  ArrowRightIcon,
  TwitterIcon,
  StarIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const FEATURES = [
  {
    icon: BarChart2Icon,
    title: "Deep Twitter Analytics",
    desc: "Track follower growth, engagement rates, impressions, and viral content. See what's working and what's not — in real time.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: UsersIcon,
    title: "Creator CRM",
    desc: "Manage your collab pipeline like a pro. Track leads, deals, activities, and relationship history in one place.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: TrendingUpIcon,
    title: "Competitor Intelligence",
    desc: "Know exactly how you stack up. Track follower growth, engagement, and content strategy of up to 20 competitors.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: BrainIcon,
    title: "AI Agent Automation",
    desc: "Connect Moltbook agents to post, reply, monitor keywords, and DM followers — all on autopilot.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: ZapIcon,
    title: "Content Studio",
    desc: "AI tweet generator, thread builder, content calendar, and best-time scheduler — built for crypto creators.",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    icon: ShieldIcon,
    title: "Real-time Alerts",
    desc: "Get notified for viral tweets, follower spikes, negative sentiment, competitor growth, and 10+ more events.",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
]

const TESTIMONIALS = [
  {
    handle: "@cryptobuilder",
    name: "Crypto Builder",
    text: "CryptoScope helped me grow from 2K to 20K followers in 3 months by showing me exactly what content was working.",
    followers: "20.4K followers",
  },
  {
    handle: "@nftcreator_",
    name: "NFT Creator",
    text: "The CRM feature is insane. I closed 4 major collabs last month just because I could properly track my outreach.",
    followers: "45K followers",
  },
  {
    handle: "@ordinalbuilder",
    name: "Ordinals Builder",
    text: "The Moltbook agent integration is a game changer. My agent handles replies while I focus on building.",
    followers: "12K followers",
  },
]

const PRICING = [
  {
    name: "Free",
    price: 0,
    features: ["1 account", "7-day history", "Basic analytics", "5 CRM contacts"],
    cta: "Get Started",
    variant: "outline" as const,
  },
  {
    name: "Pro",
    price: 29,
    features: ["3 accounts", "90-day history", "Full analytics", "500 CRM contacts", "1 AI agent", "Email alerts"],
    cta: "Start Pro",
    variant: "default" as const,
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Agency",
    price: 99,
    features: ["Unlimited accounts", "Unlimited history", "10 AI agents", "Unlimited CRM", "Team collaboration", "White-label"],
    cta: "Contact Us",
    variant: "outline" as const,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b sticky top-0 bg-background/80 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="h-7 w-7 rounded-lg bg-orange-500 flex items-center justify-center">
              <ZapIcon className="h-4 w-4 text-white" />
            </div>
            CryptoScope
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="#testimonials" className="hover:text-foreground transition-colors">Reviews</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" size="sm" asChild>
              <Link href="/sign-up">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 mb-6 px-3 py-1">
          🚀 Built for Crypto Creators
        </Badge>
        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight">
          The CRM built for<br />
          <span className="text-orange-500">Crypto Creators</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Track your Twitter growth, manage creator relationships, monitor competitors,
          and automate your community with AI agents — all in one platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2 text-lg h-12 px-8"
            asChild
          >
            <Link href="/sign-up">
              Start for Free
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 text-lg" asChild>
            <Link href="/dashboard">View Demo</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          No credit card required · Free tier forever · Pay with BTC or SOL
        </p>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-6 mt-12 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 border-2 border-background"
                  style={{ background: `hsl(${i * 30 + 10} 80% 50%)` }}
                />
              ))}
            </div>
            <span>500+ creators using CryptoScope</span>
          </div>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <StarIcon key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
            ))}
            <span className="ml-1">4.9/5 rating</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "500+", label: "Active Creators" },
              { value: "2.4M+", label: "Tweets Analyzed" },
              { value: "12K+", label: "Competitor Reports" },
              { value: "$1.2M+", label: "Creator Deals Tracked" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-black text-orange-500">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-black mb-4">Everything you need to dominate</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Built specifically for crypto creators who want to grow, collaborate, and automate
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="rounded-xl border bg-card p-6 hover:border-orange-500/30 transition-colors"
              >
                <div className={`h-10 w-10 rounded-lg ${f.bg} flex items-center justify-center mb-4`}>
                  <Icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Feature spotlight: CRM */}
      <section className="border-y bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 mb-4">Creator CRM</Badge>
              <h2 className="text-4xl font-black mb-4">Manage your collab pipeline like a business</h2>
              <p className="text-muted-foreground text-lg mb-6">
                Track every relationship — from first follow to paid partnership. Log DMs, emails, calls, and notes. Never lose a deal to disorganization again.
              </p>
              <ul className="space-y-2">
                {[
                  "Kanban deal pipeline (Idea → Agreed → Live → Completed)",
                  "Twitter-linked contact profiles",
                  "Activity timeline per contact",
                  "Import contacts from your followers",
                  "Tag and filter by niche, status, value",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <CheckIcon className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border bg-card p-6 space-y-3">
              {[
                { stage: "Outreach", name: "DeFi Protocol XYZ", value: "$5,000", color: "bg-blue-500" },
                { stage: "In Talks", name: "NFT Collection Collab", value: "$2,500", color: "bg-yellow-500" },
                { stage: "Agreed", name: "Token Sponsorship", value: "$10,000", color: "bg-orange-500" },
                { stage: "Live", name: "Twitter Space Series", value: "$1,500/mo", color: "bg-green-500" },
              ].map((deal) => (
                <div key={deal.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                  <div className={`h-2 w-2 rounded-full ${deal.color}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{deal.name}</p>
                    <p className="text-xs text-muted-foreground">{deal.stage}</p>
                  </div>
                  <span className="text-sm font-bold text-green-500">{deal.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature spotlight: Agents */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 rounded-2xl border bg-card p-6 space-y-3">
            {[
              { task: "Reply to @cryptofan mention", status: "✅ Done", time: "2m ago" },
              { task: "Post thread: Bitcoin halving analysis", status: "✅ Done", time: "1h ago" },
              { task: "Monitor #Ordinals for alpha", status: "🔄 Running", time: "Now" },
              { task: "DM 50 new followers", status: "⏳ Queued", time: "In 30m" },
            ].map((task) => (
              <div key={task.task} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <div className="flex-1">
                  <p className="text-sm font-medium">{task.task}</p>
                  <p className="text-xs text-muted-foreground">{task.time}</p>
                </div>
                <span className="text-xs">{task.status}</span>
              </div>
            ))}
          </div>
          <div className="order-1 md:order-2">
            <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 mb-4">AI Agents</Badge>
            <h2 className="text-4xl font-black mb-4">Let agents do the work while you sleep</h2>
            <p className="text-muted-foreground text-lg mb-6">
              Connect your Moltbook agents to CryptoScope and automate your entire Twitter presence. Post, reply, monitor, and engage on autopilot.
            </p>
            <ul className="space-y-2">
              {[
                "Connect Moltbook agents with one API key",
                "Schedule tweets and threads ahead of time",
                "Auto-reply to mentions based on sentiment",
                "Monitor keywords and alert you to opportunities",
                "DM campaigns to new followers",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <CheckIcon className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="border-y bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black mb-4">Loved by crypto creators</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.handle} className="rounded-xl border bg-card p-6 space-y-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <TwitterIcon className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.handle} · {t.followers}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black mb-4">Simple, transparent pricing</h2>
          <p className="text-muted-foreground">Pay with card, BTC, or SOL. No hidden fees.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 space-y-4 relative ${
                plan.highlight ? "border-orange-500 shadow-lg shadow-orange-500/10" : "border-muted"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-orange-500 text-white px-3">{plan.badge}</Badge>
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-4xl font-black">
                    {plan.price === 0 ? "Free" : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && <span className="text-muted-foreground">/mo</span>}
                </div>
              </div>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckIcon className="h-4 w-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full ${plan.highlight ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
                variant={plan.variant}
                asChild
              >
                <Link href="/sign-up">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6">
          💰 Also accept Bitcoin (BTC) and Solana (SOL) payments via NOWPayments
        </p>
      </section>

      {/* CTA */}
      <section className="border-t bg-orange-500">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center text-white">
          <h2 className="text-4xl font-black mb-4">Ready to level up your crypto presence?</h2>
          <p className="text-orange-100 text-lg mb-8 max-w-xl mx-auto">
            Join 500+ crypto creators using CryptoScope to grow faster, collaborate smarter, and automate more.
          </p>
          <Button
            size="lg"
            className="bg-white text-orange-500 hover:bg-orange-50 font-bold text-lg h-12 px-10"
            asChild
          >
            <Link href="/sign-up">
              Get Started Free Today
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="text-orange-200 text-sm mt-4">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 font-bold">
              <div className="h-6 w-6 rounded bg-orange-500 flex items-center justify-center">
                <ZapIcon className="h-3.5 w-3.5 text-white" />
              </div>
              CryptoScope
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/sign-in" className="hover:text-foreground">Sign In</Link>
              <Link href="/sign-up" className="hover:text-foreground">Sign Up</Link>
              <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 CryptoScope. Built for Web3 creators.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
