import { useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  AdminLoadingState,
  AdminPanelCard,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminTableEmptyState,
} from "@/components/admin/AdminPrimitives";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminOutletsDirectory } from "@/hooks/useAdminOperations";
import { formatCurrency } from "@/lib/adminSuperData";

const AdminOutlets = () => {
  const [cityFilter, setCityFilter] = useState("all");
  const [query, setQuery] = useState("");
  const { data: outlets = [], isLoading, isError, error } = useAdminOutletsDirectory();

  const cities = useMemo(
    () => [...new Set(outlets.map((outlet) => outlet.city).filter(Boolean))].sort((left, right) => left.localeCompare(right)),
    [outlets],
  );

  const filtered = useMemo(
    () =>
      outlets.filter((outlet) => {
        const haystack = [outlet.outlet_name, outlet.client_name, outlet.owner_name, outlet.city, outlet.manager_name, outlet.contact]
          .join(" ")
          .toLowerCase();
        const matchesQuery = haystack.includes(query.toLowerCase());
        const matchesCity = cityFilter === "all" || outlet.city === cityFilter;
        return matchesQuery && matchesCity;
      }),
    [cityFilter, outlets, query],
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminSectionHeader title="Outlets / Branches" description="Track all live branches with real registry data and clearly marked platform gaps." />

        {isLoading ? (
          <AdminLoadingState />
        ) : (
          <AdminPanelCard title="Branch Directory" description="Real outlet registry from Supabase. Order sync, QR health, and outlet-level revenue need outlet-linked telemetry before they can be shown accurately.">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search outlet, client, owner, manager, or city..."
                className="max-w-md rounded-2xl"
              />
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-[180px] rounded-2xl">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isError ? (
              <AdminTableEmptyState
                title="Could not load outlets"
                description={error instanceof Error ? error.message : "An unexpected error occurred while loading outlets."}
              />
            ) : filtered.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Orders Today</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Sync</TableHead>
                      <TableHead>QR</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((outlet) => (
                      <TableRow key={outlet.outlet_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{outlet.outlet_name}</p>
                            <p className="text-xs text-slate-500">{outlet.phone || "No direct phone"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm text-slate-900">{outlet.client_name}</p>
                            <p className="text-xs text-slate-500">{outlet.contact}</p>
                          </div>
                        </TableCell>
                        <TableCell>{outlet.city}</TableCell>
                        <TableCell>{outlet.manager_name}</TableCell>
                        <TableCell>{outlet.orders_today == null ? "Not tracked" : outlet.orders_today}</TableCell>
                        <TableCell>{outlet.revenue_today == null ? "Not tracked" : formatCurrency(outlet.revenue_today)}</TableCell>
                        <TableCell><AdminStatusBadge value={outlet.sync_status} /></TableCell>
                        <TableCell><AdminStatusBadge value={outlet.qr_status} /></TableCell>
                        <TableCell><AdminStatusBadge value={outlet.outlet_status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <AdminTableEmptyState title="No outlets match this filter" description="Try a different city or clear the search query." />
            )}
          </AdminPanelCard>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminOutlets;
