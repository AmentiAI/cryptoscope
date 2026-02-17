"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AtSignIcon,
  SmileIcon,
  FrownIcon,
  MinusIcon,
  TrendingUpIcon,
  UsersIcon,
  HeartIcon,
  ExternalLinkIcon,
  SearchIcon,
} from "lucide-react"

const SENTIMENT_CONFIG = {
  positive: { icon: SmileIcon, color: "text-green-500", bg: "bg-green-500/10", label: "Positive" },
  neutral: { icon: MinusIcon, color: "text-gray-400", bg: "bg-gray-500/10", label: "Neutral" },
  negative: { icon: FrownIcon, color: "text-red-500", bg: "bg-red-500/10", label: "Negative" },
}

export default function MentionsPage() {
  const [sentimentFilter, setSentimentFilter] = useState<string>("all")
  const [hoursFilter, setHoursFilter] = useState("48")

  const { data: accounts } = api.analytics.getAccounts.useQuery()
  const accountId = accounts?.[0]?.id

  const { data: mentionsData, isLoading } = api.community.getMentions.useQuery(
    {
      accountId: accountId!,
      sentiment: sentimentFilter !== "all" ? (sentimentFilter as any) : undefined,
      hours: parseInt(hoursFilter),
    },
    { enabled: !!accountId }
  )

  const { data: sentiment } = api.community.getSentimentBreakdown.useQuery(
    { accountId: accountId!, days: 7 },
    { enabled: !!accountId }
  )

  const { data: timeline } = api.community.getMentionTimeline.useQuery(
    { accountId: accountId!, days: 14 },
    { enabled: !!accountId }
  )

  const { data: topMentioners } = api.community.getTopMentioners.useQuery(
    { accountId: accountId!, days: 30, limit: 10 },
    { enabled: !!accountId }
  )

  const { data: health } = api.community.getCommunityHealth.useQuery(
    { accountId: accountId! },
    { enabled: !!accountId }
  )

  const healthColor = (health?.healthScore ?? 0) >= 70 ? "text-green-500" : (health?.healthScore ?? 0) >= 40 ? "text-yellow-500" : "text-red-500"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Community & Mentions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monitor what people are saying about you
        </p>
      </div>

      {/* Health + Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUpIcon className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Community Health</span>
            </div>
            <p className={`text-2xl font-bold ${healthColor}`}>
              {health?.healthScore ?? "--"}
            </p>
            <p className="text-xs text-muted-foreground">{health?.healthLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <AtSignIcon className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Mentions (7d)</span>
            </div>
            <p className="text-2xl font-bold">{health?.mentionCount7d ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <SmileIcon className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Positive (7d)</span>
            </div>
            <p className="text-2xl font-bold text-green-500">{health?.positiveCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <UsersIcon className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Top Fans</span>
            </div>
            <p className="text-2xl font-bold">{health?.topFansCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sentiment breakdown */}
      {sentiment && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sentiment Breakdown (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {sentiment.breakdown.map((s) => {
                const config = SENTIMENT_CONFIG[s.sentiment as keyof typeof SENTIMENT_CONFIG] ?? SENTIMENT_CONFIG.neutral
                const Icon = config.icon
                return (
                  <div key={s.sentiment} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <div>
                      <p className={`text-sm font-semibold ${config.color}`}>{s.pct}%</p>
                      <p className="text-xs text-muted-foreground">{config.label} ({s.count})</p>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Simple bar */}
            <div className="flex mt-3 h-2 rounded-full overflow-hidden gap-0.5">
              {sentiment.breakdown.map((s) => {
                const bg = s.sentiment === "positive" ? "bg-green-500" : s.sentiment === "negative" ? "bg-red-500" : "bg-gray-500"
                return (
                  <div key={s.sentiment} className={`${bg} rounded-sm`} style={{ width: `${s.pct}%` }} />
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed">Mentions Feed</TabsTrigger>
          <TabsTrigger value="top-fans">Top Fans</TabsTrigger>
          <TabsTrigger value="top-mentioners">Top Mentioners</TabsTrigger>
        </TabsList>

        {/* FEED */}
        <TabsContent value="feed" className="space-y-4">
          <div className="flex gap-3">
            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>
            <Select value={hoursFilter} onValueChange={setHoursFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Last 6h</SelectItem>
                <SelectItem value="24">Last 24h</SelectItem>
                <SelectItem value="48">Last 48h</SelectItem>
                <SelectItem value="168">Last 7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading mentions...</div>
          ) : mentionsData?.mentions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AtSignIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No mentions found for this period.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mentionsData?.mentions.map((mention) => {
                const config = SENTIMENT_CONFIG[(mention.sentiment ?? "neutral") as keyof typeof SENTIMENT_CONFIG] ?? SENTIMENT_CONFIG.neutral
                const Icon = config.icon
                return (
                  <Card key={mention.id} className="hover:border-orange-500/20 transition-colors">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-full ${config.bg} shrink-0 mt-0.5`}>
                          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">@{mention.authorUsername}</span>
                            {mention.authorFollowerCount && (
                              <span className="text-xs text-muted-foreground">
                                {mention.authorFollowerCount.toLocaleString()} followers
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {mention.createdAt ? new Date(mention.createdAt).toLocaleDateString() : ""}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3">{mention.text}</p>
                          <div className="flex items-center gap-3 mt-2">
                            {mention.likeCount != null && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <HeartIcon className="h-3 w-3" />
                                {mention.likeCount}
                              </span>
                            )}
                            {"https://twitter.com/user/status/" + mention.id && (
                              <a
                                href={"https://twitter.com/user/status/" + mention.id}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-orange-500 flex items-center gap-1 hover:underline"
                              >
                                <ExternalLinkIcon className="h-3 w-3" />
                                View tweet
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TOP FANS */}
        <TabsContent value="top-fans">
          <TopFansTab accountId={accountId} />
        </TabsContent>

        {/* TOP MENTIONERS */}
        <TabsContent value="top-mentioners">
          <div className="space-y-2">
            {topMentioners?.map((m, i) => (
              <Card key={m.authorHandle ?? i}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 text-xs font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">@{m.authorHandle}</p>
                        {m.authorFollowerCount && (
                          <p className="text-xs text-muted-foreground">
                            {m.authorFollowerCount.toLocaleString()} followers
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{m.mentionCount} mentions</p>
                      <a
                        href={`https://twitter.com/${m.authorHandle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-orange-500 hover:underline"
                      >
                        View profile
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TopFansTab({ accountId }: { accountId?: string }) {
  const { data: fans } = api.community.getTopFans.useQuery(
    { accountId: accountId!, limit: 20 },
    { enabled: !!accountId }
  )

  if (!fans?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <UsersIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>No top fans data yet. Data is collected as mentions come in.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fans.map((fan, i) => (
        <Card key={fan.id} className="hover:border-orange-500/20 transition-colors">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold text-sm">
                #{i + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">@{fan.followerUsername}</p>
                {fan.followerCount && (
                  <p className="text-xs text-muted-foreground">
                    {fan.followerCount.toLocaleString()} followers
                  </p>
                )}
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-orange-500 border-orange-500/30 text-xs">
                  Score: {fan.engagementScore?.toFixed(1) ?? "–"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
