"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckIcon,
  ZapIcon,
  CreditCardIcon,
  BitcoinIcon,
  StarIcon,
  BuildingIcon,
  RocketIcon,
  ShieldIcon,
  InfinityIcon,
} from "lucide-react"

const PLANS = [
  {
    id: "free",
    name: "Free",
    icon: ZapIcon,
    price: { monthly: 0, annual: 0 },
    description: "Get started with basic analytics",
    features: [
      "1 Twitter account",
      "7-day data history",
      "Basic follower analytics",
      "5 CRM contacts",
      "3 competitors tracked",
      "Community forum support",
    ],
    limits: ["No agent automation", "No export", "No email alerts"],
    color: "border-muted",
    badge: null,
  },
  {
    id: "pro",
    name: "Pro",
    icon: StarIcon,
    price: { monthly: 29, annual: 19 },
    description: "For serious crypto creators",
    features: [
      "3 Twitter accounts",
      "90-day data history",
      "Full analytics suite",
      "500 CRM contacts",
      "10 competitors tracked",
      "1 AI agent",
      "Email alerts & reports",
      "Content studio & scheduler",
      "API access",
      "Priority support",
    ],
    limits: [],
    color: "border-orange-500",
    badge: "Most Popular",
    highlight: true,
  },
  {
    id: "agency",
    name: "Agency",
    icon: BuildingIcon,
    price: { monthly: 99, annual: 66 },
    description: "For teams managing multiple creators",
    features: [
      "Unlimited Twitter accounts",
      "Unlimited data history",
      "Everything in Pro",
      "Unlimited CRM contacts",
      "Unlimited competitors",
      "10 AI agents",
      "White-label reports",
      "Team collaboration (5 seats)",
      "Webhook integrations",
      "Dedicated account manager",
      "Custom integrations",
    ],
    limits: [],
    color: "border-purple-500",
    badge: "Best Value",
  },
]

export default function BillingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly")
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "crypto">("stripe")
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const { data: subscription } = api.billing.getSubscription.useQuery()
  const { data: invoices } = api.billing.getInvoices.useQuery()
  const { data: cryptoPayments } = api.billing.getCryptoPayments.useQuery()

  const createCheckout = api.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url
      setLoadingPlan(null)
    },
    onError: () => setLoadingPlan(null),
  })

  const createCryptoPayment = api.billing.createCryptoPayment.useMutation({
    onSuccess: (data) => {
      if (data.invoiceUrl) window.open(data.invoiceUrl, "_blank")
      setLoadingPlan(null)
    },
    onError: () => setLoadingPlan(null),
  })

  const openPortal = api.billing.openPortal.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url
    },
  })

  const handleUpgrade = (planId: string) => {
    if (planId === "free" || planId === subscription?.plan) return
    setLoadingPlan(planId)

    if (paymentMethod === "stripe") {
      createCheckout.mutate({ plan: planId as any, billingPeriod })
    } else {
      createCryptoPayment.mutate({ plan: planId as any, billingPeriod })
    }
  }

  const currentPlan = subscription?.plan ?? "free"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & Plans</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your subscription and payment methods
        </p>
      </div>

      {/* Current plan banner */}
      <Card className="border-orange-500/30 bg-orange-500/5">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-500 text-white capitalize text-sm px-3 py-1">
                  {currentPlan} Plan
                </Badge>
                {subscription?.status && subscription.status !== "active" && (
                  <Badge variant="outline" className="text-red-500 border-red-500/30">
                    {subscription.status}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {currentPlan === "free"
                  ? "Upgrade to unlock the full power of CryptoScope"
                  : subscription?.currentPeriodEnd
                  ? `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : "Active subscription"}
              </p>
            </div>
            {currentPlan !== "free" && subscription?.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openPortal.mutate()}
                disabled={openPortal.isPending}
              >
                <CreditCardIcon className="h-3.5 w-3.5 mr-1.5" />
                Manage Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Billing period toggle */}
      <div className="flex items-center justify-center gap-4">
        <span className={`text-sm font-medium ${billingPeriod === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>
          Monthly
        </span>
        <button
          className="relative h-6 w-12 rounded-full bg-orange-500 transition-colors"
          onClick={() => setBillingPeriod((p) => p === "monthly" ? "annual" : "monthly")}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              billingPeriod === "annual" ? "translate-x-6" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${billingPeriod === "annual" ? "text-foreground" : "text-muted-foreground"}`}>
          Annual
          <Badge className="ml-1.5 bg-green-500/20 text-green-500 text-[10px]">Save 33%</Badge>
        </span>
      </div>

      {/* Payment method selector */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setPaymentMethod("stripe")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            paymentMethod === "stripe"
              ? "border-orange-500 bg-orange-500/10 text-orange-500"
              : "border-muted text-muted-foreground hover:border-muted-foreground"
          }`}
        >
          <CreditCardIcon className="h-4 w-4" />
          Card / Stripe
        </button>
        <button
          onClick={() => setPaymentMethod("crypto")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            paymentMethod === "crypto"
              ? "border-orange-500 bg-orange-500/10 text-orange-500"
              : "border-muted text-muted-foreground hover:border-muted-foreground"
          }`}
        >
          <BitcoinIcon className="h-4 w-4" />
          BTC / SOL / Crypto
        </button>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon
          const isCurrentPlan = currentPlan === plan.id
          const price = plan.price[billingPeriod]
          const monthlyEquiv = billingPeriod === "annual" && plan.id !== "free"
            ? plan.price.annual
            : plan.price.monthly

          return (
            <Card
              key={plan.id}
              className={`relative ${plan.color} ${plan.highlight ? "shadow-lg shadow-orange-500/10" : ""}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className={`${plan.highlight ? "bg-orange-500" : "bg-purple-500"} text-white px-3`}>
                    {plan.badge}
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${plan.highlight ? "text-orange-500" : plan.id === "agency" ? "text-purple-500" : "text-muted-foreground"}`} />
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-2">
                  <span className="text-4xl font-bold">
                    {price === 0 ? "Free" : `$${price}`}
                  </span>
                  {price > 0 && (
                    <span className="text-muted-foreground text-sm ml-1">/mo</span>
                  )}
                  {billingPeriod === "annual" && price > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Billed annually (${price * 12}/yr)
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckIcon className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                  {plan.limits.map((l) => (
                    <li key={l} className="flex items-start gap-2 text-sm text-muted-foreground line-through">
                      <span className="h-4 w-4 shrink-0 mt-0.5 text-center text-xs">✗</span>
                      {l}
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    isCurrentPlan
                      ? "bg-muted text-muted-foreground cursor-default"
                      : plan.highlight
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : plan.id === "agency"
                      ? "bg-purple-500 hover:bg-purple-600 text-white"
                      : "variant-outline"
                  }`}
                  disabled={isCurrentPlan || plan.id === "free" || loadingPlan === plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                  variant={plan.id === "free" || isCurrentPlan ? "outline" : "default"}
                >
                  {isCurrentPlan
                    ? "Current Plan"
                    : plan.id === "free"
                    ? "Downgrade"
                    : loadingPlan === plan.id
                    ? "Loading..."
                    : paymentMethod === "crypto"
                    ? `Pay with Crypto →`
                    : `Upgrade to ${plan.name} →`}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Invoice history */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoice History</TabsTrigger>
          <TabsTrigger value="crypto">Crypto Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          {!invoices?.length ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No invoices yet.
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                  <div>
                    <p className="font-medium">{inv.description || "Subscription"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(inv.created * 1000).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">${(inv.amount_paid / 100).toFixed(2)}</span>
                    <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">
                      {inv.status}
                    </Badge>
                    {inv.hosted_invoice_url && (
                      <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-orange-500 hover:underline text-xs">
                        View
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="crypto">
          {!cryptoPayments?.length ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No crypto payments yet.
            </div>
          ) : (
            <div className="space-y-2">
              {cryptoPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                  <div>
                    <p className="font-medium capitalize">{payment.plan} Plan</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.currency} · {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">${`$${(payment.priceUsd / 100).toFixed(2)}`}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        payment.status === "finished"
                          ? "text-green-500 border-green-500/30"
                          : payment.status === "pending" || payment.status === "waiting"
                          ? "text-yellow-500 border-yellow-500/30"
                          : "text-red-500 border-red-500/30"
                      }`}
                    >
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
