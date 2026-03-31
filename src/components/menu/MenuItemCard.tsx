import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
type Tag = { id: string; name: string; color: string };

interface MenuItemCardProps {
  item: MenuItem;
  onToggle: (item: MenuItem) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
}

const MenuItemCard = ({ item, onToggle, onEdit, onDelete }: MenuItemCardProps) => {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    supabase
      .from("menu_item_tags")
      .select("tag_id, item_tags(id, name, color)")
      .eq("menu_item_id", item.id)
      .then(({ data }: any) => {
        if (data) setTags(data.map((d: any) => d.item_tags).filter(Boolean));
      });
  }, [item.id]);

  return (
    <div className={`bg-card rounded-xl border border-border p-4 shadow-card hover:shadow-card-hover transition-shadow ${!item.is_available ? "opacity-50" : ""}`}>
      <div className="flex gap-3">
        {item.image_url && (
          <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${item.is_veg ? "bg-green-500" : "bg-red-500"}`} />
                <span className="font-semibold text-foreground text-sm truncate">{item.name}</span>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.map((tag) => (
                    <Badge key={tag.id} className="text-[9px] px-1.5 py-0 h-4" style={{ backgroundColor: tag.color, color: "#fff", borderColor: tag.color }}>
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
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
};

export default MenuItemCard;
