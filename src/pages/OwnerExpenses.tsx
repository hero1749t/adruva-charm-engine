import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, IndianRupee, TrendingDown, Pencil, Trash2, Download, CalendarIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Expense {
  id: string;
  owner_id: string;
  category: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  payment_method: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "raw_material", label: "Raw Material", emoji: "🥬" },
  { value: "salary", label: "Salary", emoji: "👨‍🍳" },
  { value: "rent", label: "Rent", emoji: "🏠" },
  { value: "utilities", label: "Utilities", emoji: "💡" },
  { value: "maintenance", label: "Maintenance", emoji: "🔧" },
  { value: "marketing", label: "Marketing", emoji: "📢" },
  { value: "packaging", label: "Packaging", emoji: "📦" },
  { value: "other", label: "Other", emoji: "📋" },
];

const CHART_COLORS = [
  "hsl(25, 100%, 50%)", "hsl(142, 71%, 45%)", "hsl(220, 70%, 50%)",
  "hsl(38, 92%, 50%)", "hsl(280, 65%, 60%)", "hsl(0, 84%, 60%)",
  "hsl(180, 60%, 45%)", "hsl(320, 60%, 50%)",
];

const getCategoryInfo = (val: string) => CATEGORIES.find(c => c.value === val) || { label: val, emoji: "📋" };

const OwnerExpenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [inventoryCost, setInventoryCost] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({ category: "raw_material", amount: "", notes: "", payment_method: "cash", expense_date: new Date() });

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [expRes, revRes, ingRes] = await Promise.all([
      supabase.from("expenses").select("*").eq("owner_id", user.id)
        .gte("expense_date", format(monthStart, "yyyy-MM-dd"))
        .lte("expense_date", format(monthEnd, "yyyy-MM-dd"))
        .order("expense_date", { ascending: false }),
      supabase.from("orders").select("total_amount").eq("owner_id", user.id)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString())
        .neq("status", "cancelled"),
      supabase.from("ingredients").select("current_stock, cost_per_unit").eq("owner_id", user.id),
    ]);

    if (expRes.data) setExpenses(expRes.data as unknown as Expense[]);
    setRevenue((revRes.data || []).reduce((s, o) => s + Number(o.total_amount), 0));
    setInventoryCost((ingRes.data || []).reduce((s, i) => s + Number(i.current_stock) * Number(i.cost_per_unit), 0));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, selectedMonth]);

  const stats = useMemo(() => {
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const profit = revenue - totalExpenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const byCategory = CATEGORIES.map(cat => {
      const total = expenses.filter(e => e.category === cat.value).reduce((s, e) => s + Number(e.amount), 0);
      return { ...cat, total };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    const byDay = new Map<string, number>();
    expenses.forEach(e => {
      const day = format(new Date(e.expense_date), "dd MMM");
      byDay.set(day, (byDay.get(day) || 0) + Number(e.amount));
    });
    const dailyExpenses = [...byDay.entries()].map(([day, amount]) => ({ day, amount }));

    return { totalExpenses, profit, profitMargin, byCategory, dailyExpenses };
  }, [expenses, revenue]);

  const openDialog = (exp?: Expense) => {
    if (exp) {
      setEditing(exp);
      setForm({ category: exp.category, amount: String(exp.amount), notes: exp.notes || "",
        payment_method: exp.payment_method || "cash", expense_date: new Date(exp.expense_date) });
    } else {
      setEditing(null);
      setForm({ category: "raw_material", amount: "", notes: "", payment_method: "cash", expense_date: new Date() });
    }
    setDialogOpen(true);
  };

  const saveExpense = async () => {
    if (!user || !form.amount) return;
    const payload = {
      category: form.category, amount: parseFloat(form.amount), notes: form.notes || null,
      payment_method: form.payment_method,
      expense_date: format(form.expense_date, "yyyy-MM-dd"), owner_id: user.id,
    };
    if (editing) {
      await supabase.from("expenses").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("expenses").insert(payload);
    }
    setDialogOpen(false);
    toast.success("Expense saved"); fetchData();
  };

  const deleteExpense = async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    toast.success("Expense deleted"); fetchData();
  };

  const exportExcel = () => {
    if (expenses.length === 0) { toast.error("No data to export"); return; }
    const rows = [["Date", "Category", "Amount (₹)", "Payment", "Notes"]];
    expenses.forEach(e => {
      rows.push([
        format(new Date(e.expense_date), "dd/MM/yyyy"),
        getCategoryInfo(e.category).label,
        String(e.amount), e.payment_method || "cash", e.notes || "",
      ]);
    });
    rows.push([]);
    rows.push(["Summary"]);
    rows.push(["Total Revenue", `₹${revenue}`]);
    rows.push(["Total Expenses", `₹${stats.totalExpenses}`]);
    rows.push(["Inventory Value", `₹${inventoryCost.toFixed(0)}`]);
    rows.push(["Net Profit", `₹${stats.profit.toFixed(0)}`]);
    rows.push(["Profit Margin", `${stats.profitMargin.toFixed(1)}%`]);

    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-report-${format(selectedMonth, "MMM-yyyy")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const goMonth = (dir: number) => {
    setSelectedMonth(prev => dir > 0 ? subMonths(prev, -1) : subMonths(prev, 1));
  };

  return (
    <OwnerLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Expenses & Reports</h1>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => goMonth(-1)} className="text-muted-foreground hover:text-foreground text-lg">←</button>
            <span className="text-sm font-medium text-foreground">{format(selectedMonth, "MMMM yyyy")}</span>
            <button onClick={() => goMonth(1)} className="text-muted-foreground hover:text-foreground text-lg">→</button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-1" /> Add Expense
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Revenue</span>
                <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4 text-success" />
                </div>
              </div>
              <p className="font-display text-xl font-bold text-foreground">₹{revenue.toLocaleString("en-IN")}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Expenses</span>
                <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                </div>
              </div>
              <p className="font-display text-xl font-bold text-foreground">₹{stats.totalExpenses.toLocaleString("en-IN")}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Net Profit</span>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stats.profit >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                  <IndianRupee className={`w-4 h-4 ${stats.profit >= 0 ? "text-success" : "text-destructive"}`} />
                </div>
              </div>
              <p className={`font-display text-xl font-bold ${stats.profit >= 0 ? "text-success" : "text-destructive"}`}>
                ₹{Math.abs(stats.profit).toLocaleString("en-IN")}
              </p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Inventory Value</span>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="font-display text-xl font-bold text-foreground">₹{inventoryCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Daily Expenses */}
            <Card className="p-5">
              <h2 className="font-display font-bold text-foreground mb-4">Daily Expenses</h2>
              {stats.dailyExpenses.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.dailyExpenses}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(v: number) => [`₹${v}`, "Expense"]} />
                    <Bar dataKey="amount" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-muted-foreground text-sm text-center py-10">No expenses this month</p>}
            </Card>

            {/* Category Breakdown */}
            <Card className="p-5">
              <h2 className="font-display font-bold text-foreground mb-4">By Category</h2>
              {stats.byCategory.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <ResponsiveContainer width="100%" height={180} className="sm:w-1/2">
                    <PieChart>
                      <Pie data={stats.byCategory} dataKey="total" nameKey="label" cx="50%" cy="50%" outerRadius={70} strokeWidth={2}>
                        {stats.byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [`₹${v}`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-full sm:flex-1 space-y-2">
                    {stats.byCategory.map((cat, i) => (
                      <div key={cat.value} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-foreground">{cat.emoji} {cat.label}</span>
                        <span className="text-muted-foreground ml-auto">₹{cat.total.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-muted-foreground text-sm text-center py-10">No expenses this month</p>}
            </Card>
          </div>

          {/* Profit Margin Bar */}
          {revenue > 0 && (
            <Card className="p-5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display font-bold text-foreground">Profit Margin</h2>
                <span className={`font-display font-bold text-lg ${stats.profitMargin >= 0 ? "text-success" : "text-destructive"}`}>
                  {stats.profitMargin.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-3 bg-accent rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${stats.profitMargin >= 0 ? "bg-success" : "bg-destructive"}`}
                  style={{ width: `${Math.min(Math.abs(stats.profitMargin), 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>₹{stats.totalExpenses.toLocaleString("en-IN")} expenses</span>
                <span>₹{revenue.toLocaleString("en-IN")} revenue</span>
              </div>
            </Card>
          )}

          {/* Expense List */}
          <h2 className="font-display font-bold text-foreground mb-3">All Expenses</h2>
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
              <p>No expenses recorded this month</p>
              <p className="text-sm mt-1">Add expenses to track your costs</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map(exp => {
                const cat = getCategoryInfo(exp.category);
                return (
                  <div key={exp.id} className="bg-card rounded-xl border border-border p-4 shadow-card hover:shadow-card-hover transition-shadow flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-lg flex-shrink-0">
                      {cat.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{cat.label}</span>
                        <Badge variant="secondary" className="text-xs">{exp.payment_method}</Badge>
                      </div>
                      {exp.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{exp.notes}</p>}
                      <p className="text-xs text-muted-foreground">{format(new Date(exp.expense_date), "dd MMM yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-display font-bold text-foreground">₹{Number(exp.amount).toLocaleString("en-IN")}</span>
                      <button onClick={() => openDialog(exp)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteExpense(exp.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Expense</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Category</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input type="number" placeholder="Amount (₹)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.expense_date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.expense_date ? format(form.expense_date, "PPP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={form.expense_date} onSelect={(d) => d && setForm({ ...form, expense_date: d })}
                  initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Payment Method</label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <Button onClick={saveExpense} className="w-full">Save Expense</Button>
          </div>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
};

export default OwnerExpenses;
