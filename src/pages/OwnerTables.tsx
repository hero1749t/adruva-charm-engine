import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { QrCode, Plus, Trash2, Copy, Users, Sparkles, Clock, CheckCircle2, Download, X } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import type { Database } from "@/integrations/supabase/types";

type Table = Database["public"]["Tables"]["restaurant_tables"]["Row"] & {
  status?: string;
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  free: { label: "Free", color: "bg-green-500 text-primary-foreground", icon: CheckCircle2, bg: "border-green-500/30 bg-green-500/5" },
  occupied: { label: "Occupied", color: "bg-primary text-primary-foreground", icon: Users, bg: "border-primary/30 bg-primary/5" },
  reserved: { label: "Reserved", color: "bg-yellow-500 text-foreground", icon: Clock, bg: "border-yellow-500/30 bg-yellow-500/5" },
  cleaning: { label: "Cleaning", color: "bg-blue-500 text-primary-foreground", icon: Sparkles, bg: "border-blue-500/30 bg-blue-500/5" },
};

const statusCycle: Record<string, string> = {
  free: "occupied",
  occupied: "reserved",
  reserved: "cleaning",
  cleaning: "free",
};

const OwnerTables = () => {
  const { user } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState("1");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [qrTable, setQrTable] = useState<Table | null>(null);

  const fetchTables = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("owner_id", user.id)
      .order("table_number");
    if (data) setTables(data as Table[]);
    setLoading(false);
  };

  useEffect(() => { fetchTables(); }, [user]);

  // Realtime updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("tables-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_tables", filter: `owner_id=eq.${user.id}` }, () => fetchTables())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const addTables = async () => {
    if (!user) return;
    const count = parseInt(newCount);
    if (isNaN(count) || count < 1 || count > 50) {
      toast.error("Enter a number between 1 and 50");
      return;
    }
    const maxNum = tables.length > 0 ? Math.max(...tables.map((t) => t.table_number)) : 0;
    const newTables = Array.from({ length: count }, (_, i) => ({
      owner_id: user.id,
      table_number: maxNum + i + 1,
    }));
    const { error } = await supabase.from("restaurant_tables").insert(newTables);
    if (error) toast.error("Failed to add tables");
    else {
      toast.success(`${count} table(s) added`);
      setNewCount("1");
      fetchTables();
    }
  };

  const deleteTable = async (id: string) => {
    if (!confirm("Remove this table?")) return;
    await supabase.from("restaurant_tables").delete().eq("id", id);
    toast.success("Table removed");
    fetchTables();
  };

  const updateStatus = async (id: string, currentStatus: string) => {
    const newStatus = statusCycle[currentStatus] || "free";
    const { error } = await supabase
      .from("restaurant_tables")
      .update({ status: newStatus as Database["public"]["Enums"]["table_status"] })
      .eq("id", id);
    if (error) toast.error("Failed to update status");
    else fetchTables();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("restaurant_tables")
      .update({ status: status as Database["public"]["Enums"]["table_status"] })
      .eq("id", id);
    if (error) toast.error("Failed to update status");
    else fetchTables();
  };

  const getMenuUrl = (tableNum: number) =>
    `${window.location.origin}/menu/${user?.id}?table=${tableNum}`;

  const copyLink = (tableNum: number) => {
    navigator.clipboard.writeText(getMenuUrl(tableNum));
    toast.success(`Table ${tableNum} link copied!`);
  };

  const downloadQR = (tableNum: number) => {
    const canvas = document.getElementById(`qr-canvas-${tableNum}`) as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `table-${tableNum}-qr.png`;
    a.click();
    toast.success(`QR for Table ${tableNum} downloaded!`);
  };

  const filteredTables = filterStatus === "all" ? tables : tables.filter((t) => (t.status || "free") === filterStatus);

  // Stats
  const stats = {
    total: tables.length,
    free: tables.filter((t) => (t.status || "free") === "free").length,
    occupied: tables.filter((t) => (t.status || "free") === "occupied").length,
    reserved: tables.filter((t) => (t.status || "free") === "reserved").length,
    cleaning: tables.filter((t) => (t.status || "free") === "cleaning").length,
  };

  return (
    <OwnerLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Floor Layout</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage tables, track status, and generate QR codes
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { key: "all", label: "Total", count: stats.total, color: "text-foreground" },
          { key: "free", label: "Free", count: stats.free, color: "text-green-500" },
          { key: "occupied", label: "Occupied", count: stats.occupied, color: "text-primary" },
          { key: "reserved", label: "Reserved", count: stats.reserved, color: "text-yellow-500" },
          { key: "cleaning", label: "Cleaning", count: stats.cleaning, color: "text-blue-500" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setFilterStatus(s.key)}
            className={`bg-card rounded-xl border p-3 text-center transition-all ${
              filterStatus === s.key ? "border-primary ring-2 ring-primary/20" : "border-border"
            }`}
          >
            <p className={`font-display text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Add tables */}
      <div className="flex gap-3 mb-6">
        <Input
          type="number"
          min="1"
          max="50"
          value={newCount}
          onChange={(e) => setNewCount(e.target.value)}
          className="w-24"
          placeholder="Count"
        />
        <Button variant="hero" onClick={addTables}>
          <Plus className="w-4 h-4 mr-1" /> Add Tables
        </Button>
      </div>

      {/* Floor grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
              <Skeleton className="h-16 w-16 rounded-lg mx-auto" />
              <Skeleton className="h-4 w-20 mx-auto" />
              <Skeleton className="h-6 w-full" />
            </div>
          ))}
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <QrCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">{tables.length === 0 ? "No tables yet" : "No tables match this filter"}</p>
          <p className="text-sm mt-2">
            {tables.length === 0 ? "Add tables above to get started" : "Try a different status filter"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredTables.map((table) => {
            const status = (table.status as string) || "free";
            const config = statusConfig[status] || statusConfig.free;
            const StatusIcon = config.icon;

            return (
              <div
                key={table.id}
                className={`bg-card rounded-xl border-2 p-4 shadow-card transition-all hover:shadow-md ${config.bg}`}
              >
                {/* Table visual */}
                <div
                  className="w-16 h-16 mx-auto mb-3 rounded-lg border-2 border-border flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => updateStatus(table.id, status)}
                  title="Click to cycle status"
                >
                  <StatusIcon className={`w-7 h-7 ${
                    status === "free" ? "text-green-500" :
                    status === "occupied" ? "text-primary" :
                    status === "reserved" ? "text-yellow-500" :
                    "text-blue-500"
                  }`} />
                </div>

                <p className="font-display font-bold text-lg text-foreground text-center">
                  T{table.table_number}
                </p>
                {table.label && (
                  <p className="text-xs text-muted-foreground text-center truncate">{table.label}</p>
                )}

                <Badge className={`${config.color} w-full justify-center mt-2 text-xs`}>
                  {config.label}
                </Badge>

                {/* Quick status buttons */}
                <div className="grid grid-cols-2 gap-1 mt-3">
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setStatus(table.id, key)}
                      className={`text-[10px] px-1.5 py-1 rounded-md border transition-all ${
                        status === key
                          ? "border-foreground/20 bg-foreground/10 font-bold"
                          : "border-border hover:border-foreground/20"
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-1 mt-3 justify-center">
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => copyLink(table.table_number)}>
                    <Copy className="w-3 h-3 mr-1" /> Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-7 px-2"
                    onClick={() => deleteTable(table.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerTables;
