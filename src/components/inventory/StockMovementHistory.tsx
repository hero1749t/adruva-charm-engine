import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { ArrowDownCircle, ArrowUpCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface StockMovement {
  id: string;
  owner_id: string;
  ingredient_id: string;
  order_id: string | null;
  quantity_changed: number;
  movement_type: string;
  note: string | null;
  created_at: string;
}

interface Props {
  ingredientNames: Record<string, { name: string; unit: string }>;
}

const StockMovementHistory = ({ ingredientNames }: Props) => {
  const { user } = useAuth();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (data) setMovements(data as unknown as StockMovement[]);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 animate-spin opacity-40" />
        <p>Loading history...</p>
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>No stock movements yet</p>
        <p className="text-sm mt-1">Jab orders served honge, deductions yahan dikhenge</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {movements.map((m) => {
        const ing = ingredientNames[m.ingredient_id];
        const isDeduction = m.quantity_changed < 0;
        return (
          <div
            key={m.id}
            className="bg-card rounded-xl border border-border p-4 shadow-card flex items-start gap-3"
          >
            <div className={`mt-0.5 ${isDeduction ? "text-destructive" : "text-success"}`}>
              {isDeduction ? (
                <ArrowDownCircle className="w-5 h-5" />
              ) : (
                <ArrowUpCircle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-foreground truncate">
                  {ing?.name || "Unknown Ingredient"}
                </p>
                <Badge
                  variant="outline"
                  className={`shrink-0 text-xs ${
                    isDeduction
                      ? "border-destructive/20 text-destructive bg-destructive/10"
                      : "border-success/20 text-success bg-success/10"
                  }`}
                >
                  {isDeduction ? "" : "+"}{m.quantity_changed} {ing?.unit || ""}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{format(new Date(m.created_at), "dd MMM yyyy, hh:mm a")}</span>
                {m.movement_type === "order_deduction" && m.order_id && (
                  <Badge variant="secondary" className="text-[10px]">
                    Order #{m.order_id.slice(0, 6)}
                  </Badge>
                )}
                {m.movement_type === "manual_add" && (
                  <Badge variant="secondary" className="text-[10px]">Manual</Badge>
                )}
              </div>
              {m.note && (
                <p className="text-xs text-muted-foreground mt-1">{m.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StockMovementHistory;
