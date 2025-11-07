import React from 'react';
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Edit,
  Settings,
  MapPin,
  Phone,
  Mail,
  MessageCircle
} from "lucide-react";

// --- LOCAL COMPONENTS ---

// 1. Stat Card
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  iconColorClass?: string;
}
const StatCard = ({ title, value, icon: Icon, iconColorClass = "text-muted-foreground" }: StatCardProps) => (
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

// 2. Template Card
interface TemplateCardProps {
  title: string;
  type: string;
  status: 'Active' | 'Draft';
  subject: string;
  content: string;
  triggers: string[];
}
const TemplateCard = (props: TemplateCardProps) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader>
      <div className="flex items-start justify-between">
        <div>
          <CardTitle className="text-lg">{props.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{props.type}</p>
        </div>
        <Badge
          variant={props.status === 'Active' ? 'default' : 'secondary'}
          className={props.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : ''}
        >
          {props.status}
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-muted-foreground">Subject</p>
        <p className="text-sm font-medium">{props.subject}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground">Content</p>
        <p className="text-sm text-muted-foreground">{props.content}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground">Triggers</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {props.triggers.map(t => (
            <Badge key={t} variant="secondary">{t}</Badge>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-4 border-t">
        <Button variant="outline" className="w-1/2 gap-2">
          <Edit className="w-4 h-4" /> Edit
        </Button>
        <Button variant="outline" className="w-1/2 gap-2">
          <Settings className="w-4 h-4" /> Configure
        </Button>
      </div>
    </CardContent>
  </Card>
);

// 3. Contact Card
interface ContactCardProps {
  initials: string;
  name: string;
  role: string;
  location: string;
  phone: string;
  email: string;
  lastSeen?: string;
}
const ContactCard = (props: ContactCardProps) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center gap-4 mb-4">
        <Avatar className="w-10 h-10">
          <AvatarFallback>{props.initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{props.name}</p>
          <p className="text-sm text-muted-foreground">{props.role}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" /> {props.location}
          </div>
        </div>
      </div>
      <div className="space-y-2 text-sm mb-4">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-muted-foreground" />
          <span>{props.phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="truncate">{props.email}</span>
        </div>
      </div>
      <div className="flex items-center justify-between border-t pt-4">
        <Button className="flex-1 gap-2">
          <MessageCircle className="w-4 h-4" /> Message
        </Button>
        <Button variant="ghost" size="icon">
          <Phone className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Mail className="w-4 h-4" />
        </Button>
      </div>
      {props.lastSeen && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Last seen: {props.lastSeen}
        </p>
      )}
    </CardContent>
  </Card>
);

// --- MOCK DATA ---

const messageStats = [
  { title: "Total Messages", value: "4", icon: MessageSquare },
  { title: "Unread", value: "4", icon: Bell, iconColorClass: "text-yellow-600" },
  { title: "Urgent", value: "1", icon: AlertTriangle, iconColorClass: "text-destructive" },
  { title: "Active Templates", value: "3", icon: CheckSquare, iconColorClass: "text-green-600" },
];

const messageList = [
  { from: "Rajesh Kumar", zone: "North Zone", message: "Wheat harvest completed successfully. Starting post-harvest operations.", time: "2 hours ago", initials: "RK" },
  { from: "Priya Sharma", zone: "South Zone", message: "Need additional irrigation equipment for upcoming season.", time: "5 hours ago", initials: "PS" },
  { from: "Amit Patel", zone: "West Zone", message: "Cotton yield exceeded expectations by 15%. Full report attached.", time: "1 day ago", initials: "AP" },
];

const templateData: TemplateCardProps[] = [
  { title: "Low Inventory Alert", type: "Alert", status: "Active", subject: "Inventory Alert: {{item_name}} running low", content: "Current stock of {{item_name}} ({{current_stock}} {{unit}}) is below minimum threshold. Please reorder.", triggers: ["inventory low"] },
  { title: "Weather Warning", type: "Alert", status: "Active", subject: "Weather Alert: {{weather_condition}} expected", content: "Weather forecast shows {{weather_condition}} in {{zone}}. Take precautions.", triggers: ["weather alert"] },
  { title: "Maintenance Reminder", type: "Reminder", status: "Draft", subject: "Equipment Maintenance Due: {{equipment_name}}", content: "Equipment {{equipment_name}} is due for scheduled maintenance.", triggers: ["maintenance due"] },
];

const contactData: ContactCardProps[] = [
  { initials: "RK", name: "Rajesh Kumar", role: "Field Manager", location: "North Zone", phone: "+91 98765 43210", email: "rajesh.kumar@agriscale.com" },
  { initials: "PS", name: "Priya Sharma", role: "Field Manager", location: "South Zone", phone: "+91 87654 32109", email: "priya.sharma@agriscale.com" },
  { initials: "AP", name: "Amit Patel", role: "Field Manager", location: "West Zone", phone: "+91 76543 21098", email: "amit.patel@agriscale.com" },
  { initials: "SD", name: "Sunita Devi", role: "Field Manager", location: "East Zone", phone: "+91 65432 10987", email: "sunita.devi@agriscale.com", lastSeen: "28/9/2024, 4:20:00 PM" },
];

// --- MAIN PAGE COMPONENT ---

const Communications = () => {
  return (
    <PageLayout>
      <PageHeader 
        title="Communications"
        description="Manage field managers and regional operations across all zones"
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

        {/* TAB 1: MESSAGES */}
        <TabsContent value="messages" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {messageStats.map((stat) => <StatCard key={stat.title} {...stat} />)}
          </div>
          
          <Card>
            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-auto md:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search messages..." className="pl-9 w-full" />
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <Select>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="gap-2 w-full md:w-auto">
                  <Plus className="w-4 h-4" />
                  Compose
                </Button>
                <Button variant="outline" className="gap-2 w-full md:w-auto">
                  <Radio className="w-4 h-4" />
                  Broadcast
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {messageList.map((msg) => (
                <div key={msg.from} className="flex gap-4 py-4 border-b last:border-b-0">
                  <Avatar>
                    <AvatarFallback>{msg.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold">{msg.from}</p>
                        <p className="text-xs text-muted-foreground">{msg.zone}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{msg.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{msg.message}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: TEMPLATES */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Notification Templates</h2>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templateData.map((data) => <TemplateCard key={data.title} {...data} />)}
          </div>
        </TabsContent>

        {/* TAB 3: CONTACTS */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Team Contacts</h2>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Contact
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contactData.map((data) => <ContactCard key={data.name} {...data} />)}
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default Communications;
