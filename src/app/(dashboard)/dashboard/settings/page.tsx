"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TwitterIcon,
  KeyIcon,
  BellIcon,
  UserIcon,
  RefreshCwIcon,
  TrashIcon,
  CopyIcon,
  CheckIcon,
  PlusCircleIcon,
  ShieldIcon,
} from "lucide-react"

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5 text-green-500" /> : <CopyIcon className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </Button>
  )
}

export default function SettingsPage() {
  const utils = api.useUtils()

  const { data: profile } = api.settings.getProfile.useQuery()
  const { data: accounts } = api.settings.getConnectedAccounts.useQuery()
  const { data: syncHistory } = api.settings.getSyncHistory.useQuery({ limit: 5 })
  const { data: apiKeyData } = api.settings.getApiKey.useQuery()

  const triggerSync = api.settings.triggerSync.useMutation({
    onSuccess: () => {
      utils.settings.getSyncHistory.invalidate()
      utils.analytics.getAccounts.invalidate()
    },
  })

  const disconnectTwitter = api.settings.disconnectTwitter.useMutation({
    onSuccess: () => {
      utils.settings.getConnectedAccounts.invalidate()
      utils.analytics.getAccounts.invalidate()
    },
  })

  const regenerateApiKey = api.settings.regenerateApiKey.useMutation({
    onSuccess: () => utils.settings.getApiKey.invalidate(),
  })

  const revokeApiKey = api.settings.revokeApiKey.useMutation({
    onSuccess: () => utils.settings.getApiKey.invalidate(),
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account, connections, and preferences
        </p>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts" className="gap-2">
            <TwitterIcon className="h-3.5 w-3.5" />
            Twitter Accounts
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <UserIcon className="h-3.5 w-3.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <KeyIcon className="h-3.5 w-3.5" />
            API Access
          </TabsTrigger>
        </TabsList>

        {/* TWITTER ACCOUNTS */}
        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Connected Twitter Accounts</CardTitle>
              <CardDescription>
                Track analytics for multiple accounts. Pro plan: 3 accounts, Agency: unlimited.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {accounts?.length === 0 ? (
                <div className="text-center py-8">
                  <TwitterIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">No accounts connected yet</p>
                  <Button
                    className="mt-4 bg-orange-500 hover:bg-orange-600 text-white gap-2"
                    onClick={() => {
                      // In production: redirect to Twitter OAuth flow
                      window.location.href = "/api/auth/twitter"
                    }}
                  >
                    <PlusCircleIcon className="h-4 w-4" />
                    Connect Twitter Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts?.map((account) => (
                    <div key={account.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        {account.profileImageUrl ? (
                          <img
                            src={account.profileImageUrl}
                            alt={account.name ?? ""}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold">
                            {account.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">@{account.username}</p>
                            {account.verified && (
                              <Badge variant="outline" className="text-xs py-0 px-1.5 text-blue-500 border-blue-500/30">
                                ✓ Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {account.followerCount?.toLocaleString()} followers ·{" "}
                            {account.lastSyncedAt
                              ? `Synced ${new Date(account.lastSyncedAt).toLocaleString()}`
                              : "Never synced"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={triggerSync.isPending}
                          onClick={() => triggerSync.mutate({ accountId: account.id })}
                        >
                          <RefreshCwIcon className="h-3.5 w-3.5" />
                          Sync
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-400"
                          onClick={() => disconnectTwitter.mutate({ accountId: account.id })}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    className="gap-2 w-full"
                    onClick={() => { window.location.href = "/api/auth/twitter" }}
                  >
                    <PlusCircleIcon className="h-4 w-4" />
                    Connect Another Account
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sync history */}
          {syncHistory && syncHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Syncs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {syncHistory.map((job) => (
                    <div key={job.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {job.jobType} · {new Date(job.createdAt).toLocaleString()}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          job.status === "completed"
                            ? "text-green-500 border-green-500/30"
                            : job.status === "failed"
                            ? "text-red-500 border-red-500/30"
                            : job.status === "running"
                            ? "text-blue-500 border-blue-500/30"
                            : "text-gray-500 border-gray-500/30"
                        }
                      >
                        {job.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PROFILE */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Your Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Display Name</Label>
                <Input defaultValue={profile?.name ?? ""} placeholder="Your name" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input defaultValue={profile?.email ?? ""} disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed here. Manage via Clerk.</p>
              </div>
              <div className="space-y-1">
                <Label>Plan</Label>
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-500 text-white capitalize">
                    {profile?.plan ?? "free"}
                  </Badge>
                  <Button variant="link" size="sm" className="text-orange-500 px-0" asChild>
                    <a href="/dashboard/billing">Upgrade plan →</a>
                  </Button>
                </div>
              </div>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-red-500">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete your account and all data. This cannot be undone.
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API ACCESS */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldIcon className="h-4 w-4 text-orange-500" />
                API Key
              </CardTitle>
              <CardDescription>
                Use this key to integrate CryptoScope with your tools, bots, and agents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {apiKeyData?.apiKey ? (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      value={apiKeyData.apiKey}
                      readOnly
                      className="font-mono text-sm"
                      type="password"
                    />
                    <CopyButton text={apiKeyData.apiKey} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created: {apiKeyData.createdAt ? new Date(apiKeyData.createdAt).toLocaleDateString() : "Unknown"}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateApiKey.mutate()}
                      disabled={regenerateApiKey.isPending}
                    >
                      Regenerate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => revokeApiKey.mutate()}
                      disabled={revokeApiKey.isPending}
                    >
                      Revoke
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">No API key generated yet</p>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                    onClick={() => regenerateApiKey.mutate()}
                    disabled={regenerateApiKey.isPending}
                  >
                    <KeyIcon className="h-4 w-4" />
                    Generate API Key
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">API Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Base URL: <code className="bg-muted px-1 rounded text-xs">https://app.cryptoscope.ai/api/v1</code>
              </p>
              <div className="space-y-2">
                {[
                  { method: "GET", path: "/accounts", desc: "List connected Twitter accounts" },
                  { method: "GET", path: "/analytics/:accountId", desc: "Get account analytics" },
                  { method: "GET", path: "/mentions/:accountId", desc: "Get mentions" },
                  { method: "POST", path: "/crm/contacts", desc: "Create CRM contact" },
                  { method: "GET", path: "/alerts", desc: "Get active alerts" },
                ].map((ep) => (
                  <div key={ep.path} className="flex items-center gap-3 text-xs">
                    <Badge
                      variant="outline"
                      className={ep.method === "GET" ? "text-green-500 border-green-500/30" : "text-blue-500 border-blue-500/30"}
                    >
                      {ep.method}
                    </Badge>
                    <code className="text-orange-500">{ep.path}</code>
                    <span className="text-muted-foreground">{ep.desc}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Pass your API key as: <code className="bg-muted px-1 rounded">Authorization: Bearer cs_live_...</code>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
