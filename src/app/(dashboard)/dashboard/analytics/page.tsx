"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { FollowerChart } from "@/components/dashboard/FollowerChart"
import { EngagementChart } from "@/components/dashboard/EngagementChart"
import { HashtagPerformance } from "@/components/dashboard/HashtagPerformance"
import { TopTweetsTable } from "@/components/dashboard/TopTweetsTable"
import {
  UsersIcon,
  TrendingUpIcon,
  ZapIcon,
  BarChart2Icon,
  EyeIcon,
  HeartIcon,
  RepeatIcon,
  MessageCircleIcon,
} from "lucide-react"

export default function AnalyticsPage() {
  const [days, setDays] = useState("30")

  const { data: accounts, isLoading: accountsLoading } = api.analytics.getAccounts.useQuery()
  const selectedAccountId = accounts?.[0]?.id

  const { data: stats } = api.analytics.getDashboardStats.useQuery(
    { accountId: selectedAccountId! },
    { enabled: !!selectedAccountId }
  )

  const { data: followerData = [] } = api.analytics.getFollowerGrowth.useQuery(
    { accountId: selectedAccountId!, days: parseInt(days) },
    { enabled: !!selectedAccountId }
  )

  const { data: engagementData = [] } = api.analytics.getEngagement.useQuery(
    { accountId: selectedAccountId!, days: parseInt(days) },
    { enabled: !!selectedAccountId }
  )

  const { data: topTweets = [] } = api.analytics.getTopTweets.useQuery(
    { accountId: selectedAccountId!, days: parseInt(days), limit: 15 },
    { enabled: !!selectedAccountId }
  )

  const { data: hashtags = [] } = api.analytics.getHashtagPerformance.useQuery(
    { accountId: selectedAccountId!, period: parseInt(days) <= 7 ? "7d" : parseInt(days) <= 30 ? "30d" : "90d" },
    { enabled: !!selectedAccountId }
  )

  const { data: bestTimes } = api.analytics.getBestPostingTimes.useQuery(
    { accountId: selectedAccountId! },
    { enabled: !!selectedAccountId }
  )

  const followerChartData = followerData.map((d) => ({
    date: d.date instanceof Date ? d.date.toISOString() : String(d.date),
    followers: d.followerCount,
    delta: d.followerDelta ?? 0,
  }))

  const engagementChartData = engagementData.map((d) => ({
    date: d.date instanceof Date ? d.date.toISOString() : String(d.date),
    engagementRate: (d.engagementRate ?? 0) / 100,
    likes: d.avgLikes ?? 0,
    retweets: d.avgRetweets ?? 0,
    replies: d.avgReplies ?? 0,
    avgImpressions: d.avgImpressions ?? 0,
  }))

  const snapshot = stats?.latestSnapshot
  const account = stats?.account

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Twitter Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {account ? `@${account.username}` : "Connect an account to get started"}
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={<UsersIcon className="h-4 w-4" />}
          label="Followers"
          value={account?.followerCount?.toLocaleString() ?? "–"}
          change={snapshot?.followerDelta ?? undefined}
          color="text-orange-500"
        />
        <MetricCard
          icon={<TrendingUpIcon className="h-4 w-4" />}
          label="Engagement Rate"
          value={snapshot ? `${((snapshot.engagementRate ?? 0) / 100).toFixed(2)}%` : "–"}
          color="text-blue-500"
        />
        <MetricCard
          icon={<EyeIcon className="h-4 w-4" />}
          label="Avg Impressions"
          value={snapshot ? Math.round(snapshot.avgImpressions ?? 0).toLocaleString() : "–"}
          color="text-purple-500"
        />
        <MetricCard
          icon={<ZapIcon className="h-4 w-4" />}
          label="Tweets (period)"
          value={(stats?.tweetCount7d ?? 0).toString()}
          color="text-green-500"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <HeartIcon className="h-4 w-4 text-red-400" />
              <span className="text-xs text-muted-foreground">Avg Likes / Tweet</span>
            </div>
            <p className="text-xl font-bold">{Math.round(snapshot?.avgLikes ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <RepeatIcon className="h-4 w-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Avg Retweets / Tweet</span>
            </div>
            <p className="text-xl font-bold">{Math.round(snapshot?.avgRetweets ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircleIcon className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Avg Replies / Tweet</span>
            </div>
            <p className="text-xl font-bold">{Math.round(snapshot?.avgReplies ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <FollowerChart data={followerChartData} />
        <EngagementChart data={engagementChartData} />
      </div>

      <Tabs defaultValue="tweets">
        <TabsList>
          <TabsTrigger value="tweets">Top Tweets</TabsTrigger>
          <TabsTrigger value="hashtags">Hashtag Performance</TabsTrigger>
          <TabsTrigger value="timing">Best Post Times</TabsTrigger>
        </TabsList>

        <TabsContent value="tweets">
          <TopTweetsTable tweets={topTweets} />
        </TabsContent>

        <TabsContent value="hashtags">
          <HashtagPerformance hashtags={hashtags} />
        </TabsContent>

        <TabsContent value="timing">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Best Hours to Post (by engagement)</CardTitle>
            </CardHeader>
            <CardContent>
              {!bestTimes?.length ? (
                <p className="text-sm text-muted-foreground">Not enough data yet.</p>
              ) : (
                <div className="space-y-3">
                  {bestTimes.map((time: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-14 text-orange-500">{time.label}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-muted-foreground">
                            {time.tweetCount} tweets · {time.avgEngagement.toLocaleString()} avg engagement
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (time.avgEngagement / (bestTimes[0]?.avgEngagement ?? 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  change,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  change?: number
  color: string
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className={`flex items-center gap-2 mb-1 ${color}`}>
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {change !== undefined && (
          <p className={`text-xs mt-0.5 ${change >= 0 ? "text-green-500" : "text-red-500"}`}>
            {change >= 0 ? "+" : ""}{change.toLocaleString()} today
          </p>
        )}
      </CardContent>
    </Card>
  )
}
