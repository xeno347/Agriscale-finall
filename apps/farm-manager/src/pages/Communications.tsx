import React, { useState } from 'react';
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Plus,
  MessageSquare,
  FileText,
  Users,
  Search,
  Radio,
  Bell,
  AlertTriangle,
  CheckSquare,
  MapPin,
  Phone,
  Mail
} from "lucide-react";

// ---------------------------------------------------
// STAT CARD
// ---------------------------------------------------
const StatCard = ({ title, value, icon: Icon, iconColorClass = "text-muted-foreground" }: any) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <div className="p-3 bg-secondary rounded-lg">
        <Icon className={`w-5 h-5 ${iconColorClass}`} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

// ---------------------------------------------------
// MOCK DATA
// ---------------------------------------------------
const messageStats = [
  { title: "Total Messages", value: "4", icon: MessageSquare },
  { title: "Unread", value: "4", icon: Bell, iconColorClass: "text-yellow-600" },
  { title: "Urgent", value: "1", icon: AlertTriangle, iconColorClass: "text-destructive" },
  { title: "Active Templates", value: "3", icon: CheckSquare, iconColorClass: "text-green-600" },
];

const messageList = [
  { from: "Rajesh Kumar", zone: "North Zone", message: "Wheat harvest completed successfully.", time: "2 hours ago", initials: "RK" },
  { from: "Priya Sharma", zone: "South Zone", message: "Need additional irrigation equipment.", time: "5 hours ago", initials: "PS" },
  { from: "Amit Patel", zone: "West Zone", message: "Cotton yield exceeded expectations.", time: "1 day ago", initials: "AP" },
];

const templateData = [
  { title: "Low Inventory Alert", type: "Alert", status: "Active" },
  { title: "Weather Warning", type: "Alert", status: "Active" },
  { title: "Maintenance Reminder", type: "Reminder", status: "Active" },
];

const contactData = [
  { initials: "RK", name: "Rajesh Kumar", role: "Field Manager", location: "North Zone", phone: "+91 98765 43210", email: "rajesh.kumar@agriscale.com" },
  { initials: "PS", name: "Priya Sharma", role: "Field Manager", location: "South Zone", phone: "+91 87654 32109", email: "priya.sharma@agriscale.com" },
  { initials: "AP", name: "Amit Patel", role: "Field Manager", location: "West Zone", phone: "+91 76543 21098", email: "amit.patel@agriscale.com" },
];

// ---------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------
const Communications = () => {
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <PageLayout>
      <PageHeader 
        title="Communications"
        description="Manage messages, templates and field staff communication"
      />
      
      <Tabs defaultValue="messages">
        <TabsList className="mb-4">
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="w-4 h-4" /> Messages
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Users className="w-4 h-4" /> Contacts
          </TabsTrigger>
        </TabsList>

        {/* MESSAGES TAB */}
        <TabsContent value="messages" className="space-y-6">
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {messageStats.map((stat) => <StatCard key={stat.title} {...stat} />)}
          </div>
          
          {/* SEARCH + ACTIONS */}
          <Card>
            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search messages..." className="pl-9 w-full" />
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto">
                <Select>
                  <SelectTrigger><SelectValue placeholder="Filter" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>

                <Button className="gap-2" onClick={() => setIsComposeModalOpen(true)}>
                  <Plus className="w-4 h-4" /> Compose
                </Button>

                <Button variant="outline" className="gap-2" onClick={() => setIsBroadcastModalOpen(true)}>
                  <Radio className="w-4 h-4" /> Broadcast
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* MESSAGE LIST */}
          <Card>
            <CardContent className="p-4 space-y-4">
              {messageList.map((msg, index) => (
                <div key={index} className="flex items-start gap-4 p-3 border-b last:border-none">
                  <Avatar><AvatarFallback>{msg.initials}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{msg.from} • <span className="text-sm text-muted-foreground">{msg.zone}</span></p>
                    <p className="text-muted-foreground text-sm">{msg.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{msg.time}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------- TEMPLATES TAB ----------------- */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Message Templates</h2>
            <Button className="gap-2" onClick={() => setIsTemplateModalOpen(true)}>
              <Plus className="w-4 h-4" /> Create Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templateData.map((t) => (
              <Card key={t.title} className="p-4">
                <h3 className="font-semibold">{t.title}</h3>
                <p className="text-sm text-muted-foreground">{t.type} • {t.status}</p>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ----------------- CONTACTS TAB ----------------- */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Team Contacts</h2>
            <Button className="gap-2" onClick={() => setIsContactModalOpen(true)}>
              <Plus className="w-4 h-4" /> Add Contact
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contactData.map((c) => (
              <Card key={c.name} className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar><AvatarFallback>{c.initials}</AvatarFallback></Avatar>
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.role}</p>
                    <p className="text-xs text-muted-foreground">{c.location}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-sm">
                  <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {c.phone}</p>
                  <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> {c.email}</p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* -------------------------
          DIALOG 1 — COMPOSE MESSAGE
      ------------------------- */}
      <Dialog open={isComposeModalOpen} onOpenChange={setIsComposeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compose Message</DialogTitle>
            <DialogDescription>Send a message to any field manager.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Recipient */}
            <div>
              <label className="text-sm font-medium">Recipient</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Choose recipient" /></SelectTrigger>
                <SelectContent>
                  {contactData.map((c) => (
                    <SelectItem key={c.email} value={c.email}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input placeholder="Enter subject" />
            </div>

            {/* Message */}
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea rows={5} placeholder="Write your message..." />
            </div>

            {/* Priority */}
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Normal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Attachment */}
            <div>
              <label className="text-sm font-medium">Attachment (optional)</label>
              <Input type="file" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComposeModalOpen(false)}>Cancel</Button>
            <Button>Send Message</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------------------------
          DIALOG 2 — BROADCAST MESSAGE
      ------------------------- */}
      <Dialog open={isBroadcastModalOpen} onOpenChange={setIsBroadcastModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Broadcast Message</DialogTitle>
            <DialogDescription>Send a message to multiple recipients.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Target Group</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Field Managers</SelectItem>
                  <SelectItem value="north">North Zone</SelectItem>
                  <SelectItem value="south">South Zone</SelectItem>
                  <SelectItem value="east">East Zone</SelectItem>
                  <SelectItem value="west">West Zone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea rows={5} placeholder="Enter broadcast message..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBroadcastModalOpen(false)}>Cancel</Button>
            <Button>Broadcast</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------------------------
          DIALOG 3 — CREATE TEMPLATE
      ------------------------- */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
            <DialogDescription>Define a reusable message template.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Template Title</label>
              <Input placeholder="Enter title" />
            </div>

            <div>
              <label className="text-sm font-medium">Category</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alert">Alert</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input placeholder="Enter subject line" />
            </div>

            <div>
              <label className="text-sm font-medium">Template Body</label>
              <Textarea rows={6} placeholder="Write template message..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>Cancel</Button>
            <Button>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------------------------
          DIALOG 4 — ADD CONTACT
      ------------------------- */}
      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input placeholder="Enter name" />
            </div>

            <div>
              <label className="text-sm font-medium">Role</label>
              <Input placeholder="Enter role (ex: Field Manager)" />
            </div>

            <div>
              <label className="text-sm font-medium">Location / Zone</label>
              <Input placeholder="Enter zone (ex: North Zone)" />
            </div>

            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input placeholder="+91 XXXXX XXXXX" />
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <Input placeholder="example@agriscale.com" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContactModalOpen(false)}>Cancel</Button>
            <Button>Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PageLayout>
  );
};

export default Communications;
