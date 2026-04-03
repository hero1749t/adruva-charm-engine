export type ClientStatus = "Active" | "Trial" | "Paused" | "At Risk";
export type OnboardingStatus = "Pending" | "In Progress" | "Ready" | "Delayed";
export type InvoiceStatus = "Paid" | "Pending" | "Overdue" | "Failed" | "Refunded";
export type TicketStatus = "Open" | "In Progress" | "Escalated" | "Resolved";
export type Priority = "Low" | "Medium" | "High" | "Critical";
export type SyncStatus = "Live" | "Delayed" | "Offline";
export type QrStatus = "Active" | "Pending" | "Needs Refresh";

export type ClientRecord = {
  id: string;
  name: string;
  contact: string;
  plan: "Starter" | "Growth" | "Premium" | "Enterprise";
  status: ClientStatus;
  outlets: number;
  onboardingStatus: OnboardingStatus;
  lastActive: string;
  subscriptionExpiry: string;
  city: string;
  monthlyRevenue: number;
  owner: string;
};

export type OutletRecord = {
  id: string;
  clientId: string;
  name: string;
  city: string;
  manager: string;
  status: "Active" | "Pending" | "Offline";
  ordersToday: number;
  revenueToday: number;
  syncStatus: SyncStatus;
  qrStatus: QrStatus;
};

export type InvoiceRecord = {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  tax: number;
  dueDate: string;
  method: string;
  status: InvoiceStatus;
};

export type TicketRecord = {
  id: string;
  clientId: string;
  clientName: string;
  subject: string;
  category: string;
  priority: Priority;
  assignedAgent: string;
  sla: string;
  status: TicketStatus;
};

export type OnboardingChecklist = {
  businessInfo: boolean;
  brandingUploaded: boolean;
  menuImported: boolean;
  taxConfigured: boolean;
  paymentSetup: boolean;
  qrGenerated: boolean;
  printerConnected: boolean;
  staffAccounts: boolean;
  testOrder: boolean;
  goLive: boolean;
};

export type OnboardingRecord = {
  clientId: string;
  clientName: string;
  owner: string;
  status: OnboardingStatus;
  progress: number;
  checklist: OnboardingChecklist;
};

export type AdminUserRecord = {
  id: string;
  name: string;
  email: string;
  role:
    | "Super Admin"
    | "Admin"
    | "Onboarding Manager"
    | "Support Agent"
    | "Finance Manager"
    | "Sales Manager"
    | "Tech Operator"
    | "Client Owner"
    | "Outlet Manager";
  scope: string;
  status: "Active" | "Invited" | "Suspended";
};

export type FeatureModuleRecord = {
  key: string;
  name: string;
  description: string;
  starter: boolean;
  growth: boolean;
  premium: boolean;
  enterprise: boolean;
};

export type TemplateRecord = {
  id: string;
  name: string;
  type: "Menu" | "Invoice" | "QR" | "Email" | "WhatsApp" | "Onboarding";
  status: "Published" | "Draft";
  updatedAt: string;
};

export type IntegrationRecord = {
  id: string;
  name: string;
  category: "Payment Gateway" | "WhatsApp API" | "SMS" | "Email" | "Printer" | "Analytics";
  status: "Connected" | "Pending" | "Error";
  lastSync: string;
};

export type NotificationRecord = {
  id: string;
  title: string;
  type: "Subscription" | "Payments" | "Onboarding" | "Outlet" | "Support" | "System";
  severity: "Info" | "Warning" | "Critical";
  createdAt: string;
};

export type ActivityLogRecord = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  target: string;
  device: string;
  result: "Success" | "Warning" | "Failed";
};

export const planCatalog = [
  { name: "Starter", price: 2999, billingCycle: "Monthly", clients: 12, status: "Live" },
  { name: "Growth", price: 6999, billingCycle: "Monthly", clients: 21, status: "Live" },
  { name: "Premium", price: 12999, billingCycle: "Monthly", clients: 9, status: "Live" },
  { name: "Enterprise", price: 24999, billingCycle: "Custom", clients: 3, status: "Custom" },
] as const;

export const clients: ClientRecord[] = [
  {
    id: "cli-101",
    name: "Kalura Cafe",
    contact: "deepu@kaluracafe.com",
    plan: "Growth",
    status: "Active",
    outlets: 3,
    onboardingStatus: "Ready",
    lastActive: "2 mins ago",
    subscriptionExpiry: "2026-04-28",
    city: "Haldwani",
    monthlyRevenue: 6999,
    owner: "Deepu Kalura",
  },
  {
    id: "cli-102",
    name: "Spice Route Bistro",
    contact: "owner@spiceroute.in",
    plan: "Premium",
    status: "Active",
    outlets: 5,
    onboardingStatus: "Ready",
    lastActive: "9 mins ago",
    subscriptionExpiry: "2026-04-10",
    city: "Delhi",
    monthlyRevenue: 12999,
    owner: "Rhea Sharma",
  },
  {
    id: "cli-103",
    name: "Urban Tandoor",
    contact: "ops@urbantandoor.com",
    plan: "Starter",
    status: "Trial",
    outlets: 1,
    onboardingStatus: "In Progress",
    lastActive: "25 mins ago",
    subscriptionExpiry: "2026-04-07",
    city: "Noida",
    monthlyRevenue: 0,
    owner: "Karan Mehta",
  },
  {
    id: "cli-104",
    name: "Foxtail Kitchens",
    contact: "hello@foxtailkitchens.com",
    plan: "Enterprise",
    status: "Active",
    outlets: 12,
    onboardingStatus: "Ready",
    lastActive: "1 hour ago",
    subscriptionExpiry: "2026-06-15",
    city: "Bengaluru",
    monthlyRevenue: 24999,
    owner: "Prerna Jain",
  },
  {
    id: "cli-105",
    name: "Biryani Beat",
    contact: "finance@biryanibeat.in",
    plan: "Growth",
    status: "At Risk",
    outlets: 2,
    onboardingStatus: "Delayed",
    lastActive: "4 hours ago",
    subscriptionExpiry: "2026-04-05",
    city: "Lucknow",
    monthlyRevenue: 6999,
    owner: "Arif Khan",
  },
  {
    id: "cli-106",
    name: "The Samosa Story",
    contact: "support@samosastory.in",
    plan: "Starter",
    status: "Paused",
    outlets: 1,
    onboardingStatus: "Pending",
    lastActive: "Yesterday",
    subscriptionExpiry: "2026-04-03",
    city: "Jaipur",
    monthlyRevenue: 2999,
    owner: "Neha Vyas",
  },
];

export const outlets: OutletRecord[] = [
  { id: "out-11", clientId: "cli-101", name: "Kalura Cafe - Main Market", city: "Haldwani", manager: "Amit Rawat", status: "Active", ordersToday: 126, revenueToday: 18240, syncStatus: "Live", qrStatus: "Active" },
  { id: "out-12", clientId: "cli-101", name: "Kalura Cafe - Station Road", city: "Haldwani", manager: "Pooja Joshi", status: "Active", ordersToday: 92, revenueToday: 14220, syncStatus: "Live", qrStatus: "Active" },
  { id: "out-13", clientId: "cli-102", name: "Spice Route - Connaught Place", city: "Delhi", manager: "Vikas Sethi", status: "Active", ordersToday: 211, revenueToday: 35400, syncStatus: "Delayed", qrStatus: "Needs Refresh" },
  { id: "out-14", clientId: "cli-104", name: "Foxtail Kitchens - Whitefield", city: "Bengaluru", manager: "Ananya Rao", status: "Active", ordersToday: 324, revenueToday: 52880, syncStatus: "Live", qrStatus: "Active" },
  { id: "out-15", clientId: "cli-105", name: "Biryani Beat - Gomti Nagar", city: "Lucknow", manager: "Sajid Ali", status: "Offline", ordersToday: 0, revenueToday: 0, syncStatus: "Offline", qrStatus: "Pending" },
  { id: "out-16", clientId: "cli-103", name: "Urban Tandoor - Sector 18", city: "Noida", manager: "Rohit Bansal", status: "Pending", ordersToday: 18, revenueToday: 3120, syncStatus: "Delayed", qrStatus: "Pending" },
];

export const invoices: InvoiceRecord[] = [
  { id: "inv-4001", clientId: "cli-101", clientName: "Kalura Cafe", amount: 6999, tax: 1259.82, dueDate: "2026-04-28", method: "UPI AutoPay", status: "Paid" },
  { id: "inv-4002", clientId: "cli-102", clientName: "Spice Route Bistro", amount: 12999, tax: 2339.82, dueDate: "2026-04-10", method: "Card", status: "Pending" },
  { id: "inv-4003", clientId: "cli-105", clientName: "Biryani Beat", amount: 6999, tax: 1259.82, dueDate: "2026-04-05", method: "Net Banking", status: "Failed" },
  { id: "inv-4004", clientId: "cli-106", clientName: "The Samosa Story", amount: 2999, tax: 539.82, dueDate: "2026-04-03", method: "UPI", status: "Overdue" },
  { id: "inv-4005", clientId: "cli-104", clientName: "Foxtail Kitchens", amount: 24999, tax: 4499.82, dueDate: "2026-06-15", method: "Bank Transfer", status: "Paid" },
];

export const tickets: TicketRecord[] = [
  { id: "tic-701", clientId: "cli-105", clientName: "Biryani Beat", subject: "Payment retry failing on renewal", category: "Billing", priority: "Critical", assignedAgent: "Rashi", sla: "00:42:18", status: "Escalated" },
  { id: "tic-702", clientId: "cli-103", clientName: "Urban Tandoor", subject: "Printer mapping incomplete", category: "Onboarding", priority: "High", assignedAgent: "Manav", sla: "02:10:00", status: "In Progress" },
  { id: "tic-703", clientId: "cli-102", clientName: "Spice Route Bistro", subject: "QR table menu sync lag", category: "Operations", priority: "Medium", assignedAgent: "Megha", sla: "04:28:00", status: "Open" },
  { id: "tic-704", clientId: "cli-101", clientName: "Kalura Cafe", subject: "Need WhatsApp template changes", category: "Template", priority: "Low", assignedAgent: "Vivek", sla: "08:00:00", status: "Resolved" },
];

export const onboardingRecords: OnboardingRecord[] = [
  {
    clientId: "cli-103",
    clientName: "Urban Tandoor",
    owner: "Karan Mehta",
    status: "In Progress",
    progress: 70,
    checklist: {
      businessInfo: true,
      brandingUploaded: true,
      menuImported: true,
      taxConfigured: false,
      paymentSetup: true,
      qrGenerated: true,
      printerConnected: false,
      staffAccounts: true,
      testOrder: true,
      goLive: false,
    },
  },
  {
    clientId: "cli-105",
    clientName: "Biryani Beat",
    owner: "Arif Khan",
    status: "Delayed",
    progress: 50,
    checklist: {
      businessInfo: true,
      brandingUploaded: true,
      menuImported: false,
      taxConfigured: false,
      paymentSetup: false,
      qrGenerated: true,
      printerConnected: false,
      staffAccounts: true,
      testOrder: false,
      goLive: false,
    },
  },
  {
    clientId: "cli-106",
    clientName: "The Samosa Story",
    owner: "Neha Vyas",
    status: "Pending",
    progress: 20,
    checklist: {
      businessInfo: true,
      brandingUploaded: false,
      menuImported: false,
      taxConfigured: false,
      paymentSetup: false,
      qrGenerated: false,
      printerConnected: false,
      staffAccounts: false,
      testOrder: false,
      goLive: false,
    },
  },
];

export const adminUsers: AdminUserRecord[] = [
  { id: "usr-1", name: "Deepak Rawat", email: "deepak@adruva.com", role: "Super Admin", scope: "Platform", status: "Active" },
  { id: "usr-2", name: "Nikita Sharma", email: "nikita@adruva.com", role: "Onboarding Manager", scope: "North India", status: "Active" },
  { id: "usr-3", name: "Harsh Bedi", email: "harsh@adruva.com", role: "Support Agent", scope: "Tier 1 Support", status: "Active" },
  { id: "usr-4", name: "Riya Sood", email: "riya@adruva.com", role: "Finance Manager", scope: "Billing Ops", status: "Active" },
  { id: "usr-5", name: "Vikas Arya", email: "vikas@kaluracafe.com", role: "Client Owner", scope: "Kalura Cafe", status: "Invited" },
];

export const featureModules: FeatureModuleRecord[] = [
  { key: "qr", name: "QR Ordering", description: "Table and room QR menu ordering", starter: true, growth: true, premium: true, enterprise: true },
  { key: "pos", name: "POS Billing", description: "Counter billing and cashier workflows", starter: true, growth: true, premium: true, enterprise: true },
  { key: "inventory", name: "Inventory", description: "Ingredient and stock tracking", starter: false, growth: true, premium: true, enterprise: true },
  { key: "kds", name: "Kitchen Display", description: "Real-time kitchen order queue", starter: false, growth: true, premium: true, enterprise: true },
  { key: "waiter", name: "Waiter App", description: "Staff-assisted table ordering", starter: false, growth: false, premium: true, enterprise: true },
  { key: "feedback", name: "Feedback", description: "Post-meal review collection", starter: true, growth: true, premium: true, enterprise: true },
  { key: "loyalty", name: "Loyalty", description: "Rewards and repeat guest retention", starter: false, growth: false, premium: true, enterprise: true },
  { key: "multi", name: "Multi Outlet", description: "Branch and chain management", starter: false, growth: false, premium: true, enterprise: true },
  { key: "reports", name: "Advanced Reports", description: "MRR, outlet, and menu insights", starter: false, growth: true, premium: true, enterprise: true },
  { key: "whatsapp", name: "WhatsApp Alerts", description: "Customer and ops alerts", starter: false, growth: true, premium: true, enterprise: true },
  { key: "api", name: "API Access", description: "External data and custom integrations", starter: false, growth: false, premium: false, enterprise: true },
  { key: "branding", name: "Custom Branding", description: "White-label menu and invoice styling", starter: false, growth: false, premium: true, enterprise: true },
];

export const templates: TemplateRecord[] = [
  { id: "tmp-1", name: "Modern Menu - Amber", type: "Menu", status: "Published", updatedAt: "2 hours ago" },
  { id: "tmp-2", name: "Invoice Pro v3", type: "Invoice", status: "Published", updatedAt: "Yesterday" },
  { id: "tmp-3", name: "QR Stand Minimal", type: "QR", status: "Draft", updatedAt: "3 days ago" },
  { id: "tmp-4", name: "Payment Reminder Sequence", type: "Email", status: "Published", updatedAt: "1 week ago" },
  { id: "tmp-5", name: "Onboarding Welcome Flow", type: "WhatsApp", status: "Published", updatedAt: "2 weeks ago" },
];

export const integrations: IntegrationRecord[] = [
  { id: "int-1", name: "Razorpay", category: "Payment Gateway", status: "Connected", lastSync: "2 mins ago" },
  { id: "int-2", name: "Meta WhatsApp Cloud", category: "WhatsApp API", status: "Connected", lastSync: "7 mins ago" },
  { id: "int-3", name: "MSG91", category: "SMS", status: "Pending", lastSync: "1 hour ago" },
  { id: "int-4", name: "Resend", category: "Email", status: "Connected", lastSync: "12 mins ago" },
  { id: "int-5", name: "Sunmi Bridge", category: "Printer", status: "Error", lastSync: "23 mins ago" },
  { id: "int-6", name: "GA4", category: "Analytics", status: "Connected", lastSync: "5 mins ago" },
];

export const notifications: NotificationRecord[] = [
  { id: "not-1", title: "3 subscriptions expiring within 7 days", type: "Subscription", severity: "Warning", createdAt: "5 mins ago" },
  { id: "not-2", title: "Payment failed for Biryani Beat renewal", type: "Payments", severity: "Critical", createdAt: "12 mins ago" },
  { id: "not-3", title: "Urban Tandoor onboarding delayed at printer setup", type: "Onboarding", severity: "Warning", createdAt: "36 mins ago" },
  { id: "not-4", title: "Lucknow outlet sync offline for 19 minutes", type: "Outlet", severity: "Critical", createdAt: "42 mins ago" },
  { id: "not-5", title: "Ticket tic-701 breached escalation threshold", type: "Support", severity: "Critical", createdAt: "1 hour ago" },
];

export const activityLogs: ActivityLogRecord[] = [
  { id: "act-1", timestamp: "2026-04-03 09:14", user: "Deepak Rawat", action: "Updated client plan", module: "Subscriptions", target: "Kalura Cafe", device: "Chrome / Delhi", result: "Success" },
  { id: "act-2", timestamp: "2026-04-03 08:52", user: "Riya Sood", action: "Marked invoice paid", module: "Payments", target: "inv-4001", device: "Edge / Haldwani", result: "Success" },
  { id: "act-3", timestamp: "2026-04-03 08:10", user: "Harsh Bedi", action: "Escalated billing ticket", module: "Support", target: "tic-701", device: "Chrome / Noida", result: "Warning" },
  { id: "act-4", timestamp: "2026-04-03 07:46", user: "System", action: "Detected outlet sync failure", module: "Integrations", target: "Biryani Beat - Gomti Nagar", device: "Server", result: "Failed" },
];

export const clientGrowth = [
  { month: "Nov", clients: 18 },
  { month: "Dec", clients: 22 },
  { month: "Jan", clients: 26 },
  { month: "Feb", clients: 31 },
  { month: "Mar", clients: 39 },
  { month: "Apr", clients: 47 },
];

export const revenueTrend = [
  { month: "Nov", revenue: 68000 },
  { month: "Dec", revenue: 92000 },
  { month: "Jan", revenue: 118000 },
  { month: "Feb", revenue: 132000 },
  { month: "Mar", revenue: 158000 },
  { month: "Apr", revenue: 181000 },
];

export const planDistribution = [
  { name: "Starter", value: 12 },
  { name: "Growth", value: 21 },
  { name: "Premium", value: 9 },
  { name: "Enterprise", value: 3 },
];

export const ticketStatusDistribution = [
  { name: "Open", value: 14 },
  { name: "In Progress", value: 9 },
  { name: "Escalated", value: 4 },
  { name: "Resolved", value: 38 },
];

export const moduleUsage = [
  { name: "QR Ordering", usage: 92 },
  { name: "POS Billing", usage: 88 },
  { name: "Inventory", usage: 61 },
  { name: "Kitchen Display", usage: 54 },
  { name: "WhatsApp Alerts", usage: 43 },
];

export const dashboardSummary = {
  totalClients: 47,
  activeClients: 38,
  trialClients: 6,
  totalOutlets: 96,
  activeSubscriptions: 33,
  expiringSoon: 5,
  monthlyRevenue: 181420,
  pendingTickets: 13,
  pendingOnboarding: 4,
  failedPayments: 3,
};

export const recentClients = clients.slice(0, 4);
export const expiringSubscriptions = clients
  .filter((client) => ["2026-04-28", "2026-04-10", "2026-04-07", "2026-04-05", "2026-04-03"].includes(client.subscriptionExpiry))
  .slice(0, 4);
export const failedPaymentInvoices = invoices.filter((invoice) => ["Failed", "Overdue"].includes(invoice.status));
export const latestSupportTickets = tickets.slice(0, 4);

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
