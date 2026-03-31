import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, X, Tag } from "lucide-react";

interface TagManagerProps {
  userId: string;
  menuItemId?: string; // If provided, manage tags for this item
}

type ItemTag = { id: string; name: string; color: string; owner_id: string };

const TagManager = ({ userId, menuItemId }: TagManagerProps) => {
  const [allTags, setAllTags] = useState<ItemTag[]>([]);
  const [assignedTagIds, setAssignedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#FF6B00");
  const [showCreate, setShowCreate] = useState(false);

  const fetchTags = async () => {
    const { data } = await supabase.from("item_tags").select("*").eq("owner_id", userId) as any;
    if (data) setAllTags(data);

    if (menuItemId) {
      const { data: links } = await supabase.from("menu_item_tags").select("tag_id").eq("menu_item_id", menuItemId) as any;
      if (links) setAssignedTagIds(links.map((l: any) => l.tag_id));
    }
  };

  useEffect(() => { fetchTags(); }, [userId, menuItemId]);

  const createTag = async () => {
    if (!newTagName.trim()) return;
    await supabase.from("item_tags").insert({ name: newTagName.trim(), color: newTagColor, owner_id: userId } as any);
    setNewTagName(""); setShowCreate(false);
    toast.success("Tag created"); fetchTags();
  };

  const toggleTag = async (tagId: string) => {
    if (!menuItemId) return;
    if (assignedTagIds.includes(tagId)) {
      await supabase.from("menu_item_tags").delete().eq("menu_item_id", menuItemId).eq("tag_id", tagId);
      setAssignedTagIds((prev) => prev.filter((id) => id !== tagId));
    } else {
      await supabase.from("menu_item_tags").insert({ menu_item_id: menuItemId, tag_id: tagId } as any);
      setAssignedTagIds((prev) => [...prev, tagId]);
    }
  };

  const deleteTag = async (tagId: string) => {
    await supabase.from("item_tags").delete().eq("id", tagId);
    toast.success("Tag deleted"); fetchTags();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" /> Tags
        </p>
        <Button variant="ghost" size="sm" onClick={() => setShowCreate(!showCreate)} className="h-7 px-2 text-xs">
          <Plus className="w-3 h-3 mr-1" /> New Tag
        </Button>
      </div>

      {showCreate && (
        <div className="flex gap-2 items-center">
          <Input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="e.g. Bestseller" className="h-8 text-sm flex-1" />
          <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer" />
          <Button size="sm" onClick={createTag} className="h-8">Add</Button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {allTags.map((tag) => {
          const isActive = assignedTagIds.includes(tag.id);
          return (
            <div key={tag.id} className="group relative">
              <Badge
                variant={isActive ? "default" : "outline"}
                className="cursor-pointer text-xs transition-colors"
                style={isActive ? { backgroundColor: tag.color, borderColor: tag.color, color: "#fff" } : { borderColor: tag.color, color: tag.color }}
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </Badge>
              {!menuItemId && (
                <button
                  onClick={() => deleteTag(tag.id)}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive text-destructive-foreground rounded-full hidden group-hover:flex items-center justify-center"
                >
                  <X className="w-2 h-2" />
                </button>
              )}
            </div>
          );
        })}
        {allTags.length === 0 && <p className="text-xs text-muted-foreground">No tags yet. Create one above.</p>}
      </div>
    </div>
  );
};

export default TagManager;
