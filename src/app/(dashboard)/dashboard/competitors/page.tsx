"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  TrendingUpIcon,
  TrendingDownIcon,
  UsersIcon,
  PlusCircleIcon,
  TrashIcon,
  RefreshCwIcon,
  TwitterIcon,
  BarChart2Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  ExternalLinkIcon,
} from "lucide-react"

export default function CompetitorsPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [newHandle, setNewHandle] = useState("")

  const utils = api.useUtils()

  const { data: accounts } = api.analytics.getAccounts.useQuery()
  const accountId = accounts?.[0]?.id

  const { data: competitors, isLoading } = api.analytics.getCompetitors.useQuery(
    { accountId: accountId! },
    { enabled: !!accountId }
  )

  const { data: comparison } = api.analytics.compareWithCompetitors.useQuery(
    { accountId: accountId! },
    { enabled: !!accountId }
  )

  const addCompetitor = api.analytics.addCompetitor.useMutation({
    onSuccess: () => {
      utils.analytics.getCompetitors.invalidate()
      setAddOpen(false)
      setNewHandle("")
    },
  })

  const removeCompetitor = api.analytics.removeCompetitor.useMutation({
    onSuccess: () => utils.analytics.getCompetitors.invalidate(),
  })

  const refreshCompetitor = api.analytics.refreshCompetitor.useMutation({
    onSuccess: () => utils.analytics.getCompetitors.invalidate(),
  })

  const myAccount = comparison?.myAccount
  const myFollowers = myAccount?.followerCount ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Competitor Intelligence</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track and compare against other accounts in your niche
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
              <PlusCircleIcon className="h-4 w-4" />
              Add Competitor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Track a Competitor</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Twitter Handle</Label>
                <Input
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  placeholder="@handle (without @)"
                />
              </div>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                disabled={!newHandle || !accountId || addCompetitor.isPending}
                onClick={() =>
                  addCompetitor.mutate({
                    accountId: accountId!,
                    twitterHandle: newHandle.replace("@", ""),
                  })
                }
              >
                {addCompetitor.isPending ? "Adding..." : "Start Tracking"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* My Account benchmark */}
      {myAccount && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
                YOU
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">@{myAccount.username}</p>
                  <Badge className="bg-orange-500 text-white text-xs">Your Account</Badge>
                </div>
                <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                  <span>👥 {myAccount.followerCount?.toLocaleString()} followers</span>
                  <span>📝 {myAccount.tweetCount?.toLocaleString()} tweets</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competitors grid */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading competitors...</div>
      ) : competitors?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart2Icon className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No competitors tracked yet</p>
          <p className="text-sm mt-1">Add accounts to compare your growth and engagement</p>
        </div>
      ) : (
        <div className="space-y-3">
          {competitors?.map((comp) => {
            const followerDelta =
              comp.followerCount && comp.followerCount
                ? comp.followerCount - comp.followerCount
                : 0
            const followerGap = myFollowers - (comp.followerCount ?? 0)
            const isAhead = followerGap > 0

            return (
              <Card key={comp.id} className="hover:border-orange-500/30 transition-colors">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {comp.avatarUrl ? (
                        <img
                          src={comp.avatarUrl}
                          alt={comp.username}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm">
                          {comp.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">@{comp.username}</p>
                          {comp.twitterId && (
                            <Badge variant="outline" className="text-xs py-0 px-1.5 text-blue-500 border-blue-500/30">
                              ✓
                            </Badge>
                          )}
                          <a
                            href={`https://twitter.com/${comp.username}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-orange-500"
                          >
                            <ExternalLinkIcon className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        {comp.displayName && (
                          <p className="text-xs text-muted-foreground">{comp.displayName}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => refreshCompetitor.mutate({ competitorId: comp.id })}
                        disabled={refreshCompetitor.isPending}
                      >
                        <RefreshCwIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-400"
                        onClick={() => removeCompetitor.mutate({ competitorId: comp.id })}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Followers</p>
                      <p className="font-bold text-sm">
                        {comp.followerCount?.toLocaleString() ?? "–"}
                      </p>
                      {followerDelta !== 0 && (
                        <div className={`flex items-center justify-center gap-0.5 text-xs ${followerDelta > 0 ? "text-green-500" : "text-red-500"}`}>
                          {followerDelta > 0 ? (
                            <ArrowUpIcon className="h-3 w-3" />
                          ) : (
                            <ArrowDownIcon className="h-3 w-3" />
                          )}
                          {Math.abs(followerDelta).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Tweets</p>
                      <p className="font-bold text-sm">
                        {comp.tweetCount?.toLocaleString() ?? "–"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Eng. Rate</p>
                      <p className="font-bold text-sm">
                        {comp.avgEngagementRate
                          ? `${(comp.avgEngagementRate / 100).toFixed(2)}%`
                          : "–"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">vs You</p>
                      <p className={`font-bold text-sm ${isAhead ? "text-green-500" : "text-red-500"}`}>
                        {isAhead ? "+" : ""}
                        {followerGap !== 0
                          ? followerGap.toLocaleString()
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Follower gap bar */}
                  {myFollowers > 0 && comp.followerCount && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>You: {myFollowers.toLocaleString()}</span>
                        <span>@{comp.username}: {comp.followerCount.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden relative">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{
                            width: `${Math.min(100, (myFollowers / Math.max(myFollowers, comp.followerCount)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {comp.lastSyncedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last updated: {new Date(comp.lastSyncedAt).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
