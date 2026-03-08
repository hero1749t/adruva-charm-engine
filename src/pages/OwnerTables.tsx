import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { QrCode, Plus, Trash2, Copy } from "lucide-react";

import type { Database } from "@/integrations/supabase/types";
type Table = Database["public"]["Tables"]["restaurant_tables"]["Row"];

const OwnerTables = () => {
  const { user } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [newCount, setNewCount] = useState("1");

  const fetchTables = async () => {
    if (!user) return;
    const { data } = await supabase.from("restaurant_tables").select("*").eq("owner_id", user.id).order("table_number");
    if (data) setTables(data);
  };

  useEffect(() => { fetchTables(); }, [user]);

  const addTables = async () => {
    if (!user) return;
    const count = parseInt(newCount);
    if (isNaN(count) || count < 1) return;

    const maxNum = tables.length > 0 ? Math.max(...tables.map((t) => t.table_number)) : 0;
    const newTables = Array.from({ length: count }, (_, i) => ({
      owner_id: user.id,
      table_number: maxNum + i + 1,
    }));

    const { error } = await supabase.from("restaurant_tables").insert(newTables);
    if (error) toast.error("Failed to add tables");
    else {
      toast.success(`${count} table(s) added`);
      fetchTables();
    }
  };

  const deleteTable = async (id: string) => {
    await supabase.from("restaurant_tables").delete().eq("id", id);
    toast.success("Table removed");
    fetchTables();
  };

  const getMenuUrl = (tableNum: number) => {
    return `${window.location.origin}/menu/${user?.id}?table=${tableNum}`;
  };

  const copyLink = (tableNum: number) => {
    navigator.clipboard.writeText(getMenuUrl(tableNum));
    toast.success(`Table ${tableNum} link copied!`);
  };

  return (
    <OwnerLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Tables & QR Codes</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate QR codes for each table. Customers scan and order directly.</p>
      </div>

      <div className="flex gap-3 mb-6">
        <Input type="number" min="1" value={newCount} onChange={(e) => setNewCount(e.target.value)} className="w-24" placeholder="Count" />
        <Button variant="hero" onClick={addTables}>
          <Plus className="w-4 h-4 mr-1" /> Add Tables
        </Button>
      </div>

      {tables.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <QrCode className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No tables yet</p>
          <p className="text-sm mt-2">Add tables above to generate QR codes</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div key={table.id} className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
              <div className="w-32 h-32 mx-auto mb-3 bg-muted rounded-lg flex items-center justify-center">
                <QrCode className="w-16 h-16 text-muted-foreground" />
              </div>
              <p className="font-display font-bold text-lg text-foreground">Table {table.table_number}</p>
              <div className="flex gap-2 mt-3 justify-center">
                <Button variant="outline" size="sm" onClick={() => copyLink(table.table_number)}>
                  <Copy className="w-3 h-3 mr-1" /> Copy Link
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteTable(table.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerTables;
