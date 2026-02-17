"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BrainIcon,
  PlusCircleIcon,
  PlayIcon,
  PauseIcon,
  ActivityIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ZapIcon,
  BotIcon,
  ListIcon,
} from "lucide-react"

const STATUS_CONFIG = {
  active: { color: "text-green-500", bg: "bg-green-500/10 border-green-500/20", label: "Active" },
  paused: { color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20", label: "Paused" },
  disconnected: { color: "text-gray-500", bg: "bg-gray-500/10 border-gray-500/20", label: "Disconnected" },
}

const TASK_STATUS_ICONS: Record<string, React.ElementType> = {
  done: CheckCircleIcon,
  failed: XCircleIcon,
  running: ActivityIcon,
  queued: ClockIcon,
  cancelled: XCircleIcon,
}

const TASK_COLORS: Record<string, string> = {
  done: "text-green-500",
  failed: "text-red-500",
  running: "text-blue-500",
  queued: "text-gray-400",
  cancelled: "text-gray-400",
}

export default function AgentsPage() {
  const [connectOpen, setConnectOpen] = useState(false)
  const [newAgent, setNewAgent] = useState({ name: "", moltbookApiKey: "" })

  const utils = api.useUtils()

  const { data: agents, isLoading } = api.agents.listAgents.useQuery()
  const { data: recentTasks } = api.agents.getRecentTasks.useQuery({ limit: 20 })
  const { data: agentStats } = api.agents.getAgentStats.useQuery()

  const connectAgent = api.agents.connectAgent.useMutation({
    onSuccess: () => {
      utils.agents.listAgents.invalidate()
      setConnectOpen(false)
      setNewAgent({ name: "", moltbookApiKey: "" })
    },
  })

  const pauseAgent = api.agents.pauseAgent.useMutation({
    onSuccess: () => utils.agents.listAgents.invalidate(),
  })

  const resumeAgent = api.agents.resumeAgent.useMutation({
    onSuccess: () => utils.agents.listAgents.invalidate(),
  })

  const runTask = api.agents.runTask.useMutation({
    onSuccess: () => utils.agents.getRecentTasks.invalidate(),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BrainIcon className="h-6 w-6 text-orange-500" />
            AI Agents
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Connect Moltbook agents to automate your crypto creator workflow
          </p>
        </div>
        <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
              <PlusCircleIcon className="h-4 w-4" />
              Connect Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Connect a Moltbook Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Agent Name</Label>
                <Input
                  value={newAgent.name}
                  onChange={(e) => setNewAgent((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. JarvisAI_01"
                />
              </div>
              <div className="space-y-1">
                <Label>Moltbook API Key</Label>
                <Input
                  value={newAgent.moltbookApiKey}
                  onChange={(e) => setNewAgent((p) => ({ ...p, moltbookApiKey: e.target.value }))}
                  placeholder="moltbook_sk_..."
                  type="password"
                />
                <p className="text-xs text-muted-foreground">
                  Get your API key from{" "}
                  <a href="https://moltbook.com" target="_blank" rel="noreferrer" className="text-orange-500 hover:underline">
                    moltbook.com
                  </a>
                </p>
              </div>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                disabled={!newAgent.name || !newAgent.moltbookApiKey || connectAgent.isPending}
                onClick={() => connectAgent.mutate(newAgent)}
              >
                {connectAgent.isPending ? "Connecting..." : "Connect Agent"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <BotIcon className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Total Agents</span>
            </div>
            <p className="text-2xl font-bold">{agentStats?.totalAgents ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <ActivityIcon className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold text-green-500">{agentStats?.activeAgents ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircleIcon className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Tasks Done (7d)</span>
            </div>
            <p className="text-2xl font-bold">{agentStats?.completedTasks7d ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <ClockIcon className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Tasks Queued</span>
            </div>
            <p className="text-2xl font-bold">{agentStats?.queuedTasks ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents">My Agents ({agents?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="tasks">Task History</TabsTrigger>
          <TabsTrigger value="quick-run">Quick Run</TabsTrigger>
        </TabsList>

        {/* AGENTS LIST */}
        <TabsContent value="agents" className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading agents...</div>
          ) : agents?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BotIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No agents connected yet</p>
              <p className="text-sm mt-1">Connect a Moltbook agent to start automating tasks</p>
              <Button
                className="mt-4 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => setConnectOpen(true)}
              >
                Connect Your First Agent
              </Button>
            </div>
          ) : (
            agents?.map((agent) => {
              const statusConfig = STATUS_CONFIG[agent.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.disconnected
              return (
                <Card key={agent.id} className={`border ${statusConfig.bg}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                          <BotIcon className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{agent.displayName}</p>
                            <Badge variant="outline" className={`text-xs px-1.5 py-0 ${statusConfig.bg} ${statusConfig.color}`}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {agent.moltbookUsername ?? "moltbook"} · Last active{" "}
                            {agent.lastActiveAt
                              ? new Date(agent.lastActiveAt).toLocaleDateString()
                              : "Never"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {agent.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => pauseAgent.mutate({ agentId: agent.id })}
                          >
                            <PauseIcon className="h-3.5 w-3.5" />
                            Pause
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-green-500 border-green-500/30"
                            onClick={() => resumeAgent.mutate({ agentId: agent.id })}
                          >
                            <PlayIcon className="h-3.5 w-3.5" />
                            Resume
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* TASK HISTORY */}
        <TabsContent value="tasks" className="space-y-2">
          {!recentTasks?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No tasks yet. Agents will log all activity here.</p>
            </div>
          ) : (
            recentTasks.map((task) => {
              const Icon = TASK_STATUS_ICONS[task.status ?? "queued"] ?? ClockIcon
              const color = TASK_COLORS[task.status ?? "queued"] ?? "text-gray-400"
              return (
                <div key={task.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <Icon className={`h-4 w-4 ${color} shrink-0 mt-0.5`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">
                        {task.type?.replace("_", " ")}
                      </span>
                      <Badge variant="outline" className={`text-xs py-0 px-1.5 ${color}`}>
                        {task.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {task.createdAt ? new Date(task.createdAt).toLocaleString() : ""}
                      {task.errorMessage ? ` · Error: ${task.errorMessage}` : ""}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </TabsContent>

        {/* QUICK RUN */}
        <TabsContent value="quick-run">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ZapIcon className="h-4 w-4 text-orange-500" />
                Quick Run a Task
              </CardTitle>
              <CardDescription>
                Fire off a one-time agent task immediately
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!agents?.filter((a) => a.status === "active").length ? (
                <p className="text-sm text-muted-foreground">
                  Connect and activate an agent first to run tasks.
                </p>
              ) : (
                <QuickRunForm
                  agents={(agents?.filter((a) => a.status === "active") ?? []).map(a => ({ id: a.id, displayName: a.displayName }))}
                  onRun={(agentId, type, payload) =>
                    runTask.mutate({ agentId, type: type as any, payload })
                  }
                  isRunning={runTask.isPending}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Moltbook quick links */}
      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">🔗 Moltbook Integration</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Register and manage agents on Moltbook to unlock full automation
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="https://moltbook.com" target="_blank" rel="noreferrer">
                Open Moltbook
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function QuickRunForm({
  agents,
  onRun,
  isRunning,
}: {
  agents: Array<{ id: string; displayName: string }>
  onRun: (agentId: string, type: string, payload: Record<string, unknown>) => void
  isRunning: boolean
}) {
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "")
  const [taskType, setTaskType] = useState("monitor_keywords")
  const [payload, setPayload] = useState("")

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Agent</Label>
          <Select value={agentId} onValueChange={setAgentId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Task Type</Label>
          <Select value={taskType} onValueChange={setTaskType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monitor_keywords">Monitor Keywords</SelectItem>
              <SelectItem value="analyze_competitors">Analyze Competitors</SelectItem>
              <SelectItem value="reply_mention">Reply to Mention</SelectItem>
              <SelectItem value="post_tweet">Post Tweet</SelectItem>
              <SelectItem value="dm_follower">DM Follower</SelectItem>
              <SelectItem value="post_moltbook">Post to Moltbook</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Payload (JSON)</Label>
        <Input
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder='{"keywords": ["Bitcoin", "Ordinals"]}'
          className="font-mono text-sm"
        />
      </div>
      <Button
        className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
        disabled={!agentId || isRunning}
        onClick={() => {
          let parsed = {}
          try { parsed = JSON.parse(payload) } catch {}
          onRun(agentId, taskType, parsed)
        }}
      >
        <ZapIcon className="h-4 w-4" />
        {isRunning ? "Running..." : "Run Task"}
      </Button>
    </div>
  )
}
