"use client"

import { api } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BellIcon,
  ZapIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  XCircleIcon,
  HashIcon,
} from "lucide-react"

const SEVERITY_CONFIG = {
  critical: {
    icon: XCircleIcon,
    color: "text-red-500",
    bg: "bg-red-500/10 border-red-500/20",
    badge: "bg-red-500/10 text-red-500 border-red-500/20",
  },
  warning: {
    icon: AlertTriangleIcon,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    badge: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  success: {
    icon: CheckCircleIcon,
    color: "text-green-500",
    bg: "bg-green-500/10 border-green-500/20",
    badge: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  info: {
    icon: InfoIcon,
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/20",
    badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
}

export default function AlertsPage() {
  const { data: accounts } = api.analytics.getAccounts.useQuery()
  const accountId = accounts?.[0]?.id

  const { data: alerts, isLoading } = api.alerts.getAlerts.useQuery(
    { accountId, limit: 30 },
    { enabled: true, refetchInterval: 60000 }
  )

  const { data: prefs } = api.alerts.getPreferences.useQuery()

  const { data: trendingHashtags } = api.alerts.getTrendingHashtags.useQuery(
    { accountId: accountId!, limit: 10 },
    { enabled: !!accountId }
  )

  const criticalCount = alerts?.filter((a) => a.severity === "critical").length ?? 0
  const warningCount = alerts?.filter((a) => a.severity === "warning").length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BellIcon className="h-6 w-6 text-orange-500" />
            Alerts & Intelligence
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time insights and notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <Badge className="bg-red-500 text-white">{criticalCount} Critical</Badge>
          )}
          {warningCount > 0 && (
            <Badge className="bg-yellow-500 text-black">{warningCount} Warning</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed">
            Alert Feed {alerts ? `(${alerts.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="hashtags">
            <HashIcon className="h-3.5 w-3.5 mr-1" />
            Trending Hashtags
          </TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* ALERT FEED */}
        <TabsContent value="feed" className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Scanning for alerts...</div>
          ) : alerts?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircleIcon className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-60" />
              <p className="font-medium">All clear — no alerts right now</p>
              <p className="text-sm mt-1">Alerts will appear here when something needs attention</p>
            </div>
          ) : (
            alerts?.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity]
              const Icon = config.icon
              return (
                <Card key={alert.id} className={`border ${config.bg}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 ${config.color} shrink-0 mt-0.5`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">{alert.title}</p>
                          <Badge
                            variant="outline"
                            className={`text-xs px-1.5 py-0 ${config.badge}`}
                          >
                            {alert.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(alert.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        {alert.type === "viral_tweet" && (alert.data.tweetUrl as string | undefined) && (
                          <a
                            href={String(alert.data.tweetUrl as string ?? "")}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-orange-500 hover:underline mt-1 block"
                          >
                            View viral tweet →
                          </a>
                        )}
                        {alert.type === "high_value_mention" && (alert.data.tweetUrl as string | undefined) && (
                          <a
                            href={String(alert.data.tweetUrl as string ?? "")}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-orange-500 hover:underline mt-1 block"
                          >
                            View mention and reply →
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* TRENDING HASHTAGS */}
        <TabsContent value="hashtags">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUpIcon className="h-4 w-4 text-orange-500" />
                Trending Hashtags in Your Niche (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!trendingHashtags?.length ? (
                <p className="text-sm text-muted-foreground">
                  No hashtag data yet. Data populates as tweets are synced.
                </p>
              ) : (
                <div className="space-y-3">
                  {trendingHashtags.map((h, i) => (
                    <div key={h.hashtag} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-orange-500">#{h.hashtag}</span>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span>{h.totalUses?.toLocaleString() ?? 0} uses</span>
                            <span>{h.avgEngagement?.toFixed(0) ?? 0} avg eng</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full"
                            style={{
                              width: `${Math.min(100, ((h.trendScore ?? 0) / (trendingHashtags[0]?.trendScore ?? 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => navigator.clipboard.writeText(`#${h.hashtag}`)}
                      >
                        Copy
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PREFERENCES */}
        <TabsContent value="preferences">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Email Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "emailOnFollowerMilestone", label: "Follower milestones", desc: "When you hit 1K, 10K, 100K followers" },
                  { key: "emailOnViralTweet", label: "Viral tweet detected", desc: "When a tweet gets 50+ RTs in 24h" },
                  { key: "emailOnNegativeSentiment", label: "Negative sentiment spike", desc: "When 10+ negative mentions in 6h" },
                  { key: "emailOnCompetitorSpike", label: "Competitor growth spike", desc: "When a competitor grows rapidly" },
                  { key: "emailWeeklyReport", label: "Weekly analytics report", desc: "Summary every Monday morning" },
                  { key: "emailMonthlyReport", label: "Monthly performance report", desc: "Full month breakdown" },
                ].map((pref) => (
                  <div key={pref.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{pref.label}</p>
                      <p className="text-xs text-muted-foreground">{pref.desc}</p>
                    </div>
                    <Switch
                      checked={prefs?.[pref.key as keyof typeof prefs] as boolean ?? true}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Integrations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Discord Webhook URL</Label>
                  <Input placeholder="https://discord.com/api/webhooks/..." />
                  <p className="text-xs text-muted-foreground">Alerts will be posted to your Discord channel</p>
                </div>
                <div className="space-y-1">
                  <Label>Telegram Chat ID</Label>
                  <Input placeholder="@yourchannel or -1001234567890" />
                  <p className="text-xs text-muted-foreground">Alerts via Telegram bot</p>
                </div>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
