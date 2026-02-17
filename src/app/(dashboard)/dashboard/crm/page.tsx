"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  UserPlusIcon,
  SearchIcon,
  UsersIcon,
  TrendingUpIcon,
  DollarSignIcon,
  TwitterIcon,
  MailIcon,
  PhoneIcon,
  TagIcon,
  EditIcon,
  TrashIcon,
  ExternalLinkIcon,
} from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  lead: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  prospect: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  partner: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  archived: "bg-gray-500/10 text-gray-500 border-gray-500/20",
}

const DEAL_STATUS_COLORS: Record<string, string> = {
  idea: "bg-gray-500/10 text-gray-400",
  outreach: "bg-blue-500/10 text-blue-400",
  in_talks: "bg-yellow-500/10 text-yellow-400",
  agreed: "bg-orange-500/10 text-orange-400",
  live: "bg-green-500/10 text-green-400",
  completed: "bg-emerald-500/10 text-emerald-400",
  dead: "bg-red-500/10 text-red-400",
}

export default function CRMPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [addOpen, setAddOpen] = useState(false)
  const [newContact, setNewContact] = useState({
    name: "", twitterHandle: "", email: "", company: "",
    status: "lead" as const, tags: [] as string[], notes: "",
  })

  const utils = api.useUtils()

  const { data, isLoading } = api.crm.listContacts.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    limit: 50,
  })

  const { data: stats } = api.crm.getStats.useQuery()
  const { data: deals } = api.crm.listDeals.useQuery({})

  const createContact = api.crm.createContact.useMutation({
    onSuccess: () => {
      utils.crm.listContacts.invalidate()
      utils.crm.getStats.invalidate()
      setAddOpen(false)
      setNewContact({ name: "", twitterHandle: "", email: "", company: "", status: "lead", tags: [], notes: "" })
    },
  })

  const deleteContact = api.crm.deleteContact.useMutation({
    onSuccess: () => {
      utils.crm.listContacts.invalidate()
      utils.crm.getStats.invalidate()
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Creator CRM</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track relationships, deals, and collaborations
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
              <UserPlusIcon className="h-4 w-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input
                    value={newContact.name}
                    onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Twitter Handle</Label>
                  <Input
                    value={newContact.twitterHandle}
                    onChange={(e) => setNewContact((p) => ({ ...p, twitterHandle: e.target.value }))}
                    placeholder="@handle"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    value={newContact.email}
                    onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                    placeholder="email@domain.com"
                    type="email"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Company</Label>
                  <Input
                    value={newContact.company}
                    onChange={(e) => setNewContact((p) => ({ ...p, company: e.target.value }))}
                    placeholder="Company / Project"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={newContact.status}
                  onValueChange={(v: any) => setNewContact((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="active">Active Partner</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input
                  value={newContact.notes}
                  onChange={(e) => setNewContact((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Quick notes..."
                />
              </div>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                disabled={!newContact.name || createContact.isPending}
                onClick={() => createContact.mutate(newContact)}
              >
                {createContact.isPending ? "Adding..." : "Add Contact"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Total Contacts</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.totalContacts ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUpIcon className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Active Deals</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {stats?.dealsByStatus.filter(s => !["completed","dead"].includes(s.status)).reduce((a, b) => a + b.count, 0) ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSignIcon className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Active Pipeline</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              ${(stats?.activeDealValue ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSignIcon className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Total Deal Value</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              ${(stats?.totalDealValue ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts ({data?.total ?? 0})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({deals?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        {/* CONTACTS TAB */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading contacts...</div>
            ) : data?.contacts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UsersIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No contacts yet. Add your first one!</p>
              </div>
            ) : (
              data?.contacts.map((contact) => (
                <Card key={contact.id} className="hover:border-orange-500/30 transition-colors">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-semibold text-sm">
                          {(contact.twitterDisplayName ?? contact.twitterUsername ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{contact.twitterDisplayName ?? contact.twitterUsername}</p>
                            <Badge
                              variant="outline"
                              className={`text-xs px-1.5 py-0 ${STATUS_COLORS[contact.status ?? "lead"]}`}
                            >
                              {contact.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {contact.twitterUsername && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <TwitterIcon className="h-3 w-3" />
                                @{contact.twitterUsername}
                              </span>
                            )}
                            {contact.email && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MailIcon className="h-3 w-3" />
                                {contact.email}
                              </span>
                            )}
                            {contact.moltbookUsername && (
                              <span className="text-xs text-muted-foreground">{contact.moltbookUsername}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {contact.twitterUsername && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={`https://twitter.com/${contact.twitterUsername}`} target="_blank" rel="noreferrer">
                              <ExternalLinkIcon className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-400"
                          onClick={() => deleteContact.mutate({ id: contact.id })}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* DEALS TAB */}
        <TabsContent value="deals" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{deals?.length ?? 0} deals in pipeline</p>
            <Button variant="outline" size="sm">+ New Deal</Button>
          </div>
          {deals?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSignIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No deals yet. Start tracking collabs!</p>
            </div>
          ) : (
            deals?.map((deal) => (
              <Card key={deal.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{deal.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${DEAL_STATUS_COLORS[deal.status ?? "idea"]}`}>
                          {deal.status?.replace("_", " ")}
                        </Badge>
                        {deal.value && (
                          <span className="text-xs text-muted-foreground">
                            ${deal.value.toLocaleString()} {deal.id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* PIPELINE TAB */}
        <TabsContent value="pipeline">
          <div className="grid grid-cols-7 gap-3 mt-2">
            {["idea", "outreach", "in_talks", "agreed", "live", "completed", "dead"].map((stage) => {
              const stageDeals = deals?.filter((d) => d.status === stage) ?? []
              const stageValue = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0)
              return (
                <div key={stage} className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {stage.replace("_", " ")} ({stageDeals.length})
                  </div>
                  {stageDeals.length > 0 && (
                    <div className="text-xs text-orange-500 font-medium">
                      ${stageValue.toLocaleString()}
                    </div>
                  )}
                  <div className="space-y-2 min-h-16">
                    {stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        className="bg-card border rounded-md p-2 text-xs cursor-pointer hover:border-orange-500/40"
                      >
                        <p className="font-medium line-clamp-2">{deal.title}</p>
                        {deal.value && (
                          <p className="text-muted-foreground mt-1">${deal.value.toLocaleString()}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
