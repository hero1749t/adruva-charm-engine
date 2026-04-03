import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaffRole } from "@/hooks/useStaffRole";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, IndianRupee, TrendingDown, Pencil, Trash2, Download, CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import {
  normalizeUnsignedDecimalInput,
  parsePositiveNumber,
} from "@/lib/number-input";
import { useLanguage } from "@/contexts/LanguageContext";

const OwnerExpenseCharts = lazyWithRetry(() => import("@/components/analytics/OwnerExpenseCharts"));

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

const ChartSectionLoader = () => (
  <Card className="p-5 mb-6">
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  </Card>
);

const getCategoryInfo = (value: string) => CATEGORIES.find((category) => category.value === value) || { label: value, emoji: "📋" };

const OwnerExpenses = () => {
  const { ownerId, loading: roleLoading } = useStaffRole();
  const { t, language } = useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [inventoryCost, setInventoryCost] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({ category: "raw_material", amount: "", notes: "", payment_method: "cash", expense_date: new Date() });

  const monthBounds = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    return {
      expenseStart: format(monthStart, "yyyy-MM-dd"),
      expenseEnd: format(monthEnd, "yyyy-MM-dd"),
      createdStart: monthStart.toISOString(),
      createdEnd: monthEnd.toISOString(),
    };
  }, [selectedMonth]);

  const fetchData = useCallback(async () => {
    if (!ownerId) {
      setExpenses([]);
      setRevenue(0);
      setInventoryCost(0);
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const [expenseResponse, revenueResponse, ingredientResponse] = await Promise.all([
        supabase
          .from("expenses")
          .select("*")
          .eq("owner_id", ownerId)
          .gte("expense_date", monthBounds.expenseStart)
          .lte("expense_date", monthBounds.expenseEnd)
          .order("expense_date", { ascending: false }),
        supabase
          .from("orders")
          .select("total_amount")
          .eq("owner_id", ownerId)
          .gte("created_at", monthBounds.createdStart)
          .lte("created_at", monthBounds.createdEnd)
          .neq("status", "cancelled"),
        supabase
          .from("ingredients")
          .select("current_stock, cost_per_unit")
          .eq("owner_id", ownerId),
      ]);

      if (expenseResponse.error || revenueResponse.error || ingredientResponse.error) {
        throw new Error(
          expenseResponse.error?.message ||
            revenueResponse.error?.message ||
            ingredientResponse.error?.message ||
            "Failed to load expense data",
        );
      }

      setExpenses((expenseResponse.data as Expense[]) || []);
      setRevenue((revenueResponse.data || []).reduce((sum, order) => sum + Number(order.total_amount), 0));
      setInventoryCost((ingredientResponse.data || []).reduce((sum, ingredient) => sum + Number(ingredient.current_stock) * Number(ingredient.cost_per_unit), 0));
    } catch (error) {
      console.error("Failed to load expenses page data", error);
      setExpenses([]);
      setRevenue(0);
      setInventoryCost(0);
      toast.error(error instanceof Error ? error.message : (language === "hi" ? "खर्चे लोड नहीं हो पाए" : "Failed to load expense data"));
    } finally {
      setLoading(false);
    }
  }, [language, monthBounds, ownerId]);

  useEffect(() => {
    if (roleLoading) return;
    void fetchData();
  }, [fetchData, roleLoading]);

  const stats = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const profit = revenue - totalExpenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const byCategory = CATEGORIES.map((category) => ({
      ...category,
      total: expenses.filter((expense) => expense.category === category.value).reduce((sum, expense) => sum + Number(expense.amount), 0),
    })).filter((category) => category.total > 0).sort((a, b) => b.total - a.total);
    const byDay = new Map<string, number>();
    expenses.forEach((expense) => {
      const day = format(new Date(expense.expense_date), "dd MMM");
      byDay.set(day, (byDay.get(day) || 0) + Number(expense.amount));
    });
    const dailyExpenses = [...byDay.entries()].map(([day, amount]) => ({ day, amount }));
    return { totalExpenses, profit, profitMargin, byCategory, dailyExpenses };
  }, [expenses, revenue]);

  const openDialog = (expense?: Expense) => {
    if (expense) {
      setEditing(expense);
      setForm({ category: expense.category, amount: String(expense.amount), notes: expense.notes || "", payment_method: expense.payment_method || "cash", expense_date: new Date(expense.expense_date) });
    } else {
      setEditing(null);
      setForm({ category: "raw_material", amount: "", notes: "", payment_method: "cash", expense_date: new Date() });
    }
    setDialogOpen(true);
  };

  const saveExpense = async () => {
    if (!ownerId || !form.amount) return;
    const amount = parsePositiveNumber(form.amount);
    if (amount === null) {
      toast.error(language === "hi" ? "राशि 0 से बड़ी होनी चाहिए" : "Amount must be greater than 0");
      return;
    }
    const payload = { category: form.category, amount, notes: form.notes || null, payment_method: form.payment_method, expense_date: format(form.expense_date, "yyyy-MM-dd"), owner_id: ownerId };
    if (editing) {
      await supabase.from("expenses").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("expenses").insert(payload);
    }
    setDialogOpen(false);
    toast.success(t("expenses.saved"));
    void fetchData();
  };

  const deleteExpense = async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    toast.success(t("expenses.deleted"));
    void fetchData();
  };

  const exportExcel = () => {
    if (expenses.length === 0) {
      toast.error(t("expenses.noData"));
      return;
    }
    const rows: string[][] = [["Date", "Category", "Amount (INR)", "Payment", "Notes"]];
    expenses.forEach((expense) => {
      rows.push([format(new Date(expense.expense_date), "dd/MM/yyyy"), getCategoryInfo(expense.category).label, String(expense.amount), expense.payment_method || "cash", expense.notes || ""]);
    });
    rows.push([]);
    rows.push(["Summary"]);
    rows.push(["Total Revenue", `INR ${revenue}`]);
    rows.push(["Total Expenses", `INR ${stats.totalExpenses}`]);
    rows.push(["Inventory Value", `INR ${inventoryCost.toFixed(0)}`]);
    rows.push(["Net Profit", `INR ${stats.profit.toFixed(0)}`]);
    rows.push(["Profit Margin", `${stats.profitMargin.toFixed(1)}%`]);
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `expense-report-${format(selectedMonth, "MMM-yyyy")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const goMonth = (direction: number) => {
    setSelectedMonth((prev) => (direction > 0 ? subMonths(prev, -1) : subMonths(prev, 1)));
  };

  return (
    <OwnerLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">{t("expenses.title")}</h1>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => goMonth(-1)} className="text-muted-foreground hover:text-foreground text-lg">←</button>
            <span className="text-sm font-medium text-foreground">{format(selectedMonth, "MMMM yyyy")}</span>
            <button onClick={() => goMonth(1)} className="text-muted-foreground hover:text-foreground text-lg">→</button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="w-4 h-4 mr-1" /> {t("expenses.export")}</Button>
          <Button size="sm" onClick={() => openDialog()}><Plus className="w-4 h-4 mr-1" /> {t("expenses.add")}</Button>
        </div>
      </div>

      {!loading && !ownerId ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          <p className="text-lg font-medium text-foreground">{t("expenses.unavailable")}</p>
          <p className="mt-2 text-sm">{t("expenses.unavailableHint")}</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-5"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">{t("expenses.revenue")}</span><div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center"><IndianRupee className="w-4 h-4 text-success" /></div></div><p className="font-display text-xl font-bold text-foreground">INR {revenue.toLocaleString("en-IN")}</p></Card>
            <Card className="p-5"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">{t("expenses.expenses")}</span><div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center"><TrendingDown className="w-4 h-4 text-destructive" /></div></div><p className="font-display text-xl font-bold text-foreground">INR {stats.totalExpenses.toLocaleString("en-IN")}</p></Card>
            <Card className="p-5"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">{t("expenses.netProfit")}</span><div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stats.profit >= 0 ? "bg-success/10" : "bg-destructive/10"}`}><IndianRupee className={`w-4 h-4 ${stats.profit >= 0 ? "text-success" : "text-destructive"}`} /></div></div><p className={`font-display text-xl font-bold ${stats.profit >= 0 ? "text-success" : "text-destructive"}`}>INR {Math.abs(stats.profit).toLocaleString("en-IN")}</p></Card>
            <Card className="p-5"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">{t("expenses.inventoryValue")}</span><div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><IndianRupee className="w-4 h-4 text-primary" /></div></div><p className="font-display text-xl font-bold text-foreground">INR {inventoryCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p></Card>
          </div>

          <Suspense fallback={<ChartSectionLoader />}>
            <OwnerExpenseCharts byCategory={stats.byCategory} dailyExpenses={stats.dailyExpenses} />
          </Suspense>

          {revenue > 0 && (
            <Card className="p-5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display font-bold text-foreground">{t("expenses.profitMargin")}</h2>
                <span className={`font-display font-bold text-lg ${stats.profitMargin >= 0 ? "text-success" : "text-destructive"}`}>{stats.profitMargin.toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 bg-accent rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${stats.profitMargin >= 0 ? "bg-success" : "bg-destructive"}`} style={{ width: `${Math.min(Math.abs(stats.profitMargin), 100)}%` }} /></div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>INR {stats.totalExpenses.toLocaleString("en-IN")} expenses</span><span>INR {revenue.toLocaleString("en-IN")} revenue</span></div>
            </Card>
          )}

          <h2 className="font-display font-bold text-foreground mb-3">{t("expenses.all")}</h2>
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border"><p>{t("expenses.none")}</p><p className="text-sm mt-1">{t("expenses.noneHint")}</p></div>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => {
                const category = getCategoryInfo(expense.category);
                return (
                  <div key={expense.id} className="bg-card rounded-xl border border-border p-4 shadow-card hover:shadow-card-hover transition-shadow flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-lg flex-shrink-0">{category.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><span className="font-semibold text-foreground text-sm">{category.label}</span><Badge variant="secondary" className="text-xs">{expense.payment_method}</Badge></div>
                      {expense.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{expense.notes}</p>}
                      <p className="text-xs text-muted-foreground">{format(new Date(expense.expense_date), "dd MMM yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-display font-bold text-foreground">INR {Number(expense.amount).toLocaleString("en-IN")}</span>
                      <button onClick={() => openDialog(expense)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => void deleteExpense(expense.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? t("expenses.edit") : t("expenses.addDialog")}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t("expenses.category")}</label>
              <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((category) => <SelectItem key={category.value} value={category.value}>{category.emoji} {category.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={t("expenses.amount")}
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: normalizeUnsignedDecimalInput(event.target.value) })}
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.expense_date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{form.expense_date ? format(form.expense_date, "PPP") : t("expenses.pickDate")}</Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={form.expense_date} onSelect={(date) => date && setForm({ ...form, expense_date: date })} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t("expenses.paymentMethod")}</label>
              <Select value={form.payment_method} onValueChange={(value) => setForm({ ...form, payment_method: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input placeholder={t("expenses.notes")} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            <Button onClick={() => void saveExpense()} className="w-full">{t("expenses.save")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
};

export default OwnerExpenses;
