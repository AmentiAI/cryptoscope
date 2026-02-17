"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import {
  PenIcon,
  SparklesIcon,
  ClockIcon,
  BarChart2Icon,
  ZapIcon,
  CalendarIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react"

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5 text-green-500" /> : <CopyIcon className="h-3.5 w-3.5" />}
    </Button>
  )
}

export default function ContentPage() {
  const [composerText, setComposerText] = useState("")
  const [topic, setTopic] = useState("")
  const [tone, setTone] = useState<"hype" | "educational" | "controversial" | "community" | "alpha">("hype")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [threadPoints, setThreadPoints] = useState("")
  const [thread, setThread] = useState<string[]>([])

  const { data: accounts } = api.analytics.getAccounts.useQuery()
  const accountId = accounts?.[0]?.id

  const { data: bestTimes } = api.content.getBestPostingTimes.useQuery(
    { accountId: accountId! },
    { enabled: !!accountId }
  )

  const { data: contentAnalytics } = api.content.getContentAnalytics.useQuery(
    { accountId: accountId!, days: 30 },
    { enabled: !!accountId }
  )

  const generateSuggestions = api.content.generateTweetSuggestions.useMutation({
    onSuccess: (data) => setSuggestions(data),
  })

  const buildThread = api.content.buildThread.useMutation({
    onSuccess: (data) => setThread(data),
  })

  const charCount = composerText.length
  const charOver = charCount > 280

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Studio</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Compose, schedule, and analyze your content
        </p>
      </div>

      {/* Content stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <ZapIcon className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Tweets (30d)</span>
            </div>
            <p className="text-2xl font-bold">{contentAnalytics?.avgStats?.totalTweets ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart2Icon className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Avg Likes</span>
            </div>
            <p className="text-2xl font-bold">
              {Math.round(contentAnalytics?.avgStats?.avgLikes ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart2Icon className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Avg Retweets</span>
            </div>
            <p className="text-2xl font-bold">
              {Math.round(contentAnalytics?.avgStats?.avgRetweets ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart2Icon className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Avg Impressions</span>
            </div>
            <p className="text-2xl font-bold">
              {Math.round(contentAnalytics?.avgStats?.avgImpressions ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose" className="gap-2">
            <PenIcon className="h-3.5 w-3.5" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <SparklesIcon className="h-3.5 w-3.5" />
            AI Assist
          </TabsTrigger>
          <TabsTrigger value="thread" className="gap-2">
            Thread Builder
          </TabsTrigger>
          <TabsTrigger value="timing" className="gap-2">
            <ClockIcon className="h-3.5 w-3.5" />
            Best Times
          </TabsTrigger>
          <TabsTrigger value="top" className="gap-2">
            Top Tweets
          </TabsTrigger>
        </TabsList>

        {/* COMPOSE */}
        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <Textarea
                placeholder="What's happening in crypto today? 🔥"
                className="resize-none min-h-32 text-base"
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                maxLength={280}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${charOver ? "text-red-500" : charCount > 250 ? "text-yellow-500" : "text-muted-foreground"}`}>
                    {charCount}/280
                  </span>
                  {/* Circular progress */}
                  <svg className="h-5 w-5" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="hsl(var(--muted))" strokeWidth="2" />
                    <circle
                      cx="10" cy="10" r="8" fill="none"
                      stroke={charOver ? "rgb(239 68 68)" : charCount > 250 ? "rgb(234 179 8)" : "rgb(249 115 22)"}
                      strokeWidth="2"
                      strokeDasharray={`${Math.min(charCount / 280, 1) * 50.3} 50.3`}
                      transform="rotate(-90 10 10)"
                    />
                  </svg>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSuggestions([])}
                    disabled={!composerText}
                  >
                    Clear
                  </Button>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    size="sm"
                    disabled={!composerText || charOver}
                  >
                    Post Now
                  </Button>
                  <Button variant="outline" size="sm" disabled={!composerText || charOver}>
                    <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                    Schedule
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top performing tweets to inspire */}
          {contentAnalytics?.topByEngagement && contentAnalytics.topByEngagement.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Your Best Performing Tweets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {contentAnalytics.topByEngagement.map((tweet) => (
                  <div key={tweet.id} className="flex items-start gap-2 py-2 border-b last:border-0">
                    <div className="flex-1">
                      <p className="text-sm line-clamp-2">{tweet.text}</p>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>❤️ {tweet.likeCount?.toLocaleString()}</span>
                        <span>🔁 {tweet.retweetCount?.toLocaleString()}</span>
                        <span>💬 {tweet.replyCount?.toLocaleString()}</span>
                        {tweet.impressionCount && <span>👁 {tweet.impressionCount.toLocaleString()}</span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setComposerText(tweet.text ?? "")}
                    >
                      Use as template
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI ASSIST */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <SparklesIcon className="h-4 w-4 text-orange-500" />
                AI Tweet Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Topic</Label>
                  <Input
                    placeholder="e.g. Bitcoin, Ordinals, NFT drops"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Tone</Label>
                  <Select value={tone} onValueChange={(v: any) => setTone(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hype">🚀 Hype</SelectItem>
                      <SelectItem value="educational">📚 Educational</SelectItem>
                      <SelectItem value="controversial">🔥 Controversial</SelectItem>
                      <SelectItem value="community">🤝 Community</SelectItem>
                      <SelectItem value="alpha">🔐 Alpha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                onClick={() => generateSuggestions.mutate({ topic, tone, count: 5 })}
                disabled={!topic || generateSuggestions.isPending}
              >
                <SparklesIcon className="h-4 w-4" />
                {generateSuggestions.isPending ? "Generating..." : "Generate 5 Tweets"}
              </Button>
            </CardContent>
          </Card>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <Card key={i} className="hover:border-orange-500/30 transition-colors">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-2">
                      <p className="text-sm flex-1">{s}</p>
                      <div className="flex gap-1 shrink-0">
                        <CopyButton text={s} />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setComposerText(s)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs ${s.length > 280 ? "text-red-500" : "text-muted-foreground"}`}>
                        {s.length}/280 chars
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* THREAD BUILDER */}
        <TabsContent value="thread" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Thread Builder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Thread Topic</Label>
                <Input
                  placeholder="e.g. Why Ordinals are the future of Bitcoin"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Key Points (one per line)</Label>
                <Textarea
                  placeholder={"Point 1: Bitcoin is digital gold\nPoint 2: Ordinals add programmability\nPoint 3: ..."}
                  className="min-h-28 resize-none"
                  value={threadPoints}
                  onChange={(e) => setThreadPoints(e.target.value)}
                />
              </div>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                onClick={() =>
                  buildThread.mutate({
                    topic,
                    keyPoints: threadPoints.split("\n").filter(Boolean),
                    style: "informative",
                  })
                }
                disabled={!topic || !threadPoints || buildThread.isPending}
              >
                <SparklesIcon className="h-4 w-4" />
                {buildThread.isPending ? "Building..." : "Build Thread"}
              </Button>
            </CardContent>
          </Card>

          {thread.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{thread.length} tweets in thread</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(thread.join("\n\n---\n\n"))}
                >
                  Copy All
                </Button>
              </div>
              {thread.map((tweet, i) => (
                <Card key={i} className={i === 0 ? "border-orange-500/40" : ""}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                        {i === 0 ? "Hook" : i === thread.length - 1 ? "CTA" : `${i + 1}`}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{tweet}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs ${tweet.length > 280 ? "text-red-500" : "text-muted-foreground"}`}>
                            {tweet.length}/280
                          </span>
                          <CopyButton text={tweet} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* BEST TIMES */}
        <TabsContent value="timing">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-orange-500" />
                Best Posting Times for Your Audience
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!bestTimes?.length ? (
                <p className="text-muted-foreground text-sm">
                  Not enough data yet. Post more tweets to get recommendations.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Based on your historical engagement, these are your best times to post:
                  </p>
                  {bestTimes.map((time, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="text-sm font-semibold w-16 text-orange-500">
                        #{i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{time.label}</span>
                          <span className="text-xs text-muted-foreground">
                            Avg {time.avgEngagement.toLocaleString()} engagement
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full"
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

        {/* TOP TWEETS */}
        <TabsContent value="top">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Top tweets by impressions (30 days)</p>
            {contentAnalytics?.topByImpressions?.map((tweet) => (
              <Card key={tweet.id}>
                <CardContent className="py-3 px-4">
                  <p className="text-sm">{tweet.text}</p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>❤️ {tweet.likeCount?.toLocaleString() ?? 0}</span>
                    <span>🔁 {tweet.retweetCount?.toLocaleString() ?? 0}</span>
                    <span>💬 {tweet.replyCount?.toLocaleString() ?? 0}</span>
                    <span>👁 {tweet.impressionCount?.toLocaleString() ?? 0}</span>
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
