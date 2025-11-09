import React, { useState } from 'react'; // <-- 1. IMPORT useState
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"; // <-- 2. IMPORT Dialog components
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

// 1. Stat Card (for Messages Tab)
// ... (Component code remains the same) ...
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

// 2. Template Card (for Templates Tab)
// ... (Component code remains the same) ...
const TemplateCard = (props: any) => (
  <Card className="hover:shadow-md transition-shadow">
    {/* ... Card Content ... */}
  </Card>
);

// 3. Contact Card (for Contacts Tab)
// ... (Component code remains the same) ...
const ContactCard = (props: any) => (
  <Card className="hover:shadow-md transition-shadow">
    {/* ... Card Content ... */}
  </Card>
);


// --- MOCK DATA ---
// ... (messageStats, messageList, templateData, contactData) ...
const messageStats = [
  { title: "Total Messages", value: "4", icon: MessageSquare },
  { title: "Unread", value: "4", icon: Bell, iconColorClass: "text-yellow-600" },
  { title: "Urgent", value: "1", icon: AlertTriangle, iconColorClass: "text-destructive" },
  { title: "Active Templates", value: "3", icon: CheckSquare, iconColorClass: "text-success" },
];
const messageList = [
  { from: "Rajesh Kumar", zone: "North Zone", message: "Wheat harvest completed successfully. Starting post-harvest operations.", time: "2 hours ago", initials: "RK" },
  { from: "Priya Sharma", zone: "South Zone", message: "Need additional irrigation equipment for upcoming season.", time: "5 hours ago", initials: "PS" },
  { from: "Amit Patel", zone: "West Zone", message: "Cotton yield exceeded expectations by 15%. Full report attached.", time: "1 day ago", initials: "AP" },
];

const templateData = [
  { title: "Low Inventory Alert", type: "Alert", status: "Active", subject: "Inventory Alert: {{item_name}} running low", content: "Current stock of {{item_name}} ({{current_stock}} {{unit}}), which is below minimum threshold of {{min_stock}} {{unit}}. Please reorder.", triggers: ["inventory low"] },
  { title: "Weather Warning", type: "Alert", status: "Active", subject: "Weather Alert: {{weather_condition}} expected", content: "Weather forecast shows {{weather_condition}} in {{zone}} from {{start_date}} to {{end_date}}. Please take necessary precautions for crops and equipment.", triggers: ["weather alert"] },
  { title: "Maintenance Reminder", type: "Reminder", status: "Active", subject: "Equipment Maintenance Due: {{equipment_name}}", content: "Equipment {{equipment_name}} is due for scheduled maintenance on {{due_date}}. Please arrange for service to avoid operational delays.", triggers: ["maintenance due"] },
];

const contactData = [
  { initials: "RK", name: "Rajesh Kumar", role: "Field Manager", location: "North Zone", phone: "+91 98765 43210", email: "rajesh.kumar@agriscale.com" },
  { initials: "PS", name: "Priya Sharma", role: "Field Manager", location: "South Zone", phone: "+91 87654 32109", email: "priya.sharma@agriscale.com" },
  { initials: "AP", name: "Amit Patel", role: "Field Manager", location: "West Zone", phone: "+91 76543 21098", email: "amit.patel@agriscale.com" },
  { initials: "SD", name: "Sunita Devi", role: "Field Manager", location: "East Zone", phone: "+91 65432 10987", email: "sunita.devi@agriscale.com", lastSeen: "28/9/2024, 4:20:00 PM" },
];


// --- MAIN PAGE COMPONENT ---

const Communications = () => {
  // 3. ADD STATE for all modals
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

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

        {/* =================================== */}
        {/* TAB 1: MESSAGES                 */}
        {/* =================================== */}
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
                  {/* ... (Select Content) ... */}
                </Select>
                {/* 4. ADD onClick HANDLERS */}
                <Button className="gap-2 w-full md:w-auto" onClick={() => setIsComposeModalOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Compose
                </Button>
                <Button variant="outline" className="gap-2 w-full md:w-auto" onClick={() => setIsBroadcastModalOpen(true)}>
                  <Radio className="w-4 h-4" />
                  Broadcast
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            {/* ... (Recent Messages List) ... */}
          </Card>
        </TabsContent>

        {/* =================================== */}
        {/* TAB 2: TEMPLATES                */}
        {/* =================================== */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Notification Templates</h2>
            {/* 4. ADD onClick HANDLER */}
            <Button className="gap-2" onClick={() => setIsTemplateModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templateData.map((data) => <TemplateCard key={data.title} {...data} />)}
          </div>
        </TabsContent>

        {/* =================================== */}
        {/* TAB 3: CONTACTS                 */}
        {/* =================================== */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Team Contacts</h2>
            {/* 4. ADD onClick HANDLER */}
            <Button className="gap-2" onClick={() => setIsContactModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Contact
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contactData.map((data) => <ContactCard key={data.name} {...data} />)}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* 5. ADD ALL DIALOGS */}
      
      {/* Compose Message Dialog */}
      <Dialog open={isComposeModalOpen} onOpenChange={setIsComposeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compose Message</DialogTitle>
          </DialogHeader>
          <div className="py-4"><p>A form to compose a new message would go here.</p></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComposeModalOpen(false)}>Cancel</Button>
            <Button>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Broadcast Message Dialog */}
      <Dialog open={isBroadcastModalOpen} onOpenChange={setIsBroadcastModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Broadcast Message</DialogTitle>
          </DialogHeader>
          <div className="py-4"><p>A form to broadcast a message to all or some users would go here.</p></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBroadcastModalOpen(false)}>Cancel</Button>
            <Button>Broadcast</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Template Dialog */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
          </DialogHeader>
          <div className="py-4"><p>A form to create a new message template would go here.</p></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>Cancel</Button>
            <Button>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Contact Dialog */}
      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <div className="py-4"><p>A form to add a new contact would go here.</p></div>
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