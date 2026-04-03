import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Pencil, Star, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];

interface MenuItemCardProps {
  item: MenuItem;
  onToggle: (item: MenuItem) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const formatTimeRange = (from: string | null, to: string | null) => {
  if (!from && !to) return null;

  const formatPart = (value: string | null) => {
    if (!value) return "Any time";
    const [hoursString, minutesString] = value.split(":");
    const hours = Number(hoursString);
    const minutes = Number(minutesString);
    const date = new Date();

    date.setHours(hours, minutes, 0, 0);
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  return `${formatPart(from)} - ${formatPart(to)}`;
};

const getStockBadge = (item: MenuItem) => {
  if (item.stock_quantity === null) {
    return {
      label: "Open stock",
      className: "border-border text-muted-foreground",
    };
  }

  if (item.stock_quantity <= 0) {
    return {
      label: "Out of stock",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    };
  }

  if (
    item.low_stock_threshold !== null &&
    item.stock_quantity <= item.low_stock_threshold
  ) {
    return {
      label: `Low stock: ${item.stock_quantity}`,
      className: "border-amber-500/30 bg-amber-500/10 text-amber-600",
    };
  }

  return {
    label: `In stock: ${item.stock_quantity}`,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  };
};

const MenuItemCard = ({
  item,
  onToggle,
  onEdit,
  onDelete,
}: MenuItemCardProps) => {
  const stockBadge = getStockBadge(item);
  const timeRange = formatTimeRange(item.available_from, item.available_to);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover",
        !item.is_available && "opacity-65",
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(
              "border-transparent text-white",
              item.is_veg ? "bg-emerald-600" : "bg-rose-600",
            )}
          >
            <span className="mr-1 text-[10px]">●</span>
            {item.is_veg ? "Veg" : "Non-Veg"}
          </Badge>

          {item.is_featured ? (
            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-600">
              <Star className="mr-1 h-3 w-3 fill-current" />
              Featured
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="truncate text-base font-semibold text-foreground">
              {item.name}
            </h3>
            {item.description ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {item.description}
              </p>
            ) : null}
          </div>

          <Switch
            checked={item.is_available}
            onCheckedChange={() => onToggle(item)}
            aria-label={`Toggle availability for ${item.name}`}
          />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold text-foreground">
                {currency.format(item.price)}
              </span>
              {item.original_price ? (
                <span className="text-sm text-muted-foreground line-through">
                  {currency.format(item.original_price)}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {item.tax_type === "exclusive" ? "Tax Exclusive" : "Tax Inclusive"}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={`Edit ${item.name}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Delete ${item.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={stockBadge.className}>
            {stockBadge.label}
          </Badge>

          {timeRange ? (
            <Badge variant="outline" className="border-border text-muted-foreground">
              {timeRange}
            </Badge>
          ) : null}

          <Badge
            variant="outline"
            className={cn(
              item.is_available
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                : "border-border text-muted-foreground",
            )}
          >
            {item.is_available ? "Available" : "Hidden"}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
