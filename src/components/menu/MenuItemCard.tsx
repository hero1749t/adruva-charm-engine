import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];

interface MenuItemCardProps {
  item: MenuItem;
  onToggle: (item: MenuItem) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
}

const MenuItemCard = ({ item, onToggle, onEdit, onDelete }: MenuItemCardProps) => (
  <div className={`bg-card rounded-xl border border-border p-4 shadow-card hover:shadow-card-hover transition-shadow ${!item.is_available ? "opacity-50" : ""}`}>
    <div className="flex gap-3">
      {item.image_url && (
        <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${item.is_veg ? "bg-success" : "bg-destructive"}`} />
              <span className="font-semibold text-foreground text-sm truncate">{item.name}</span>
            </div>
            {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>}
            <p className="font-display font-bold text-foreground text-sm mt-1">₹{item.price}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <Switch checked={item.is_available} onCheckedChange={() => onToggle(item)} className="scale-90" />
            <div className="flex gap-0.5">
              <button onClick={() => onEdit(item)} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(item.id)} className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default MenuItemCard;
