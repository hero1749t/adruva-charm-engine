import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { QrCode, Plus, Trash2, Copy, Users, Sparkles, Clock, CheckCircle2, Download, X, DoorOpen, RefreshCw, Link2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { format, differenceInDays } from "date-fns";

interface Room {
  id: string;
  owner_id: string;
  room_number: number;
  label: string | null;
  status: string;
  qr_generated_at: string | null;
  is_active: boolean;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  free: { label: "Free", color: "bg-green-500 text-primary-foreground", icon: CheckCircle2, bg: "border-green-500/30 bg-green-500/5" },
  occupied: { label: "Occupied", color: "bg-primary text-primary-foreground", icon: Users, bg: "border-primary/30 bg-primary/5" },
  reserved: { label: "Reserved", color: "bg-yellow-500 text-foreground", icon: Clock, bg: "border-yellow-500/30 bg-yellow-500/5" },
  cleaning: { label: "Cleaning", color: "bg-blue-500 text-primary-foreground", icon: Sparkles, bg: "border-blue-500/30 bg-blue-500/5" },
};

const OwnerRooms = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState("1");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [qrRoom, setQrRoom] = useState<Room | null>(null);

  const fetchRooms = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("restaurant_rooms")
      .select("*")
      .eq("owner_id", user.id)
      .order("room_number");
    if (data) setRooms(data as Room[]);
    setLoading(false);
  };

  useEffect(() => { fetchRooms(); }, [user]);

  const addRooms = async () => {
    if (!user) return;
    const count = parseInt(newCount);
    if (isNaN(count) || count < 1 || count > 50) {
      toast.error("Enter a number between 1 and 50");
      return;
    }
    const maxNum = rooms.length > 0 ? Math.max(...rooms.map((r) => r.room_number)) : 0;
    const newRooms = Array.from({ length: count }, (_, i) => ({
      owner_id: user.id,
      room_number: maxNum + i + 1,
    }));
    const { error } = await supabase.from("restaurant_rooms").insert(newRooms);
    if (error) toast.error("Failed to add rooms");
    else {
      toast.success(`${count} room(s) added`);
      setNewCount("1");
      fetchRooms();
    }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm("Remove this room?")) return;
    await supabase.from("restaurant_rooms").delete().eq("id", id);
    toast.success("Room removed");
    fetchRooms();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("restaurant_rooms")
      .update({ status })
      .eq("id", id);
    if (error) toast.error("Failed to update status");
    else fetchRooms();
  };

  const regenerateQR = async (room: Room) => {
    const { error } = await supabase
      .from("restaurant_rooms")
      .update({ qr_generated_at: new Date().toISOString() })
      .eq("id", room.id);
    if (error) toast.error("Failed to regenerate QR");
    else {
      toast.success(`QR regenerated for Room ${room.room_number}`);
      fetchRooms();
    }
  };

  const getMenuUrl = (room: Room) => {
    const ts = room.qr_generated_at ? new Date(room.qr_generated_at).getTime() : "";
    return `${window.location.origin}/menu/${user?.id}?room=${room.room_number}&qr=${ts}`;
  };

  const getBillUrl = (room: Room) =>
    `${window.location.origin}/menu/${user?.id}?room=${room.room_number}&bill=true`;

  const copyLink = (room: Room) => {
    navigator.clipboard.writeText(getMenuUrl(room));
    toast.success(`Room ${room.room_number} link copied!`);
  };

  const copyBillLink = (room: Room) => {
    navigator.clipboard.writeText(getBillUrl(room));
    toast.success(`Bill link for Room ${room.room_number} copied!`);
  };

  const downloadQR = (roomNum: number) => {
    const canvas = document.getElementById(`qr-room-${roomNum}`) as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `room-${roomNum}-qr.png`;
    a.click();
    toast.success(`QR for Room ${roomNum} downloaded!`);
  };

  const isQRExpired = (room: Room) => {
    if (!room.qr_generated_at) return true;
    return differenceInDays(new Date(), new Date(room.qr_generated_at)) >= 30;
  };

  const filteredRooms = filterStatus === "all" ? rooms : rooms.filter((r) => r.status === filterStatus);

  const stats = {
    total: rooms.length,
    free: rooms.filter((r) => r.status === "free").length,
    occupied: rooms.filter((r) => r.status === "occupied").length,
    reserved: rooms.filter((r) => r.status === "reserved").length,
  };

  return (
    <OwnerLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Private Dining Rooms</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage rooms, QR codes & bill linking</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { key: "all", label: "Total", count: stats.total, color: "text-foreground" },
          { key: "free", label: "Free", count: stats.free, color: "text-green-500" },
          { key: "occupied", label: "Occupied", count: stats.occupied, color: "text-primary" },
          { key: "reserved", label: "Reserved", count: stats.reserved, color: "text-yellow-500" },
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

      {/* Add rooms */}
      <div className="flex gap-3 mb-6">
        <Input type="number" min="1" max="50" value={newCount} onChange={(e) => setNewCount(e.target.value)} className="w-24" placeholder="Count" />
        <Button variant="hero" onClick={addRooms}>
          <Plus className="w-4 h-4 mr-1" /> Add Rooms
        </Button>
      </div>

      {/* Rooms grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
              <Skeleton className="h-16 w-16 rounded-lg mx-auto" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <DoorOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">{rooms.length === 0 ? "No rooms yet" : "No rooms match this filter"}</p>
          <p className="text-sm mt-2">{rooms.length === 0 ? "Add rooms above to get started" : "Try a different filter"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const config = statusConfig[room.status] || statusConfig.free;
            const StatusIcon = config.icon;
            const expired = isQRExpired(room);

            return (
              <div key={room.id} className={`bg-card rounded-xl border-2 p-4 shadow-card transition-all hover:shadow-md ${config.bg}`}>
                <div className="w-16 h-16 mx-auto mb-3 rounded-lg border-2 border-border flex items-center justify-center">
                  <StatusIcon className={`w-7 h-7 ${
                    room.status === "free" ? "text-green-500" :
                    room.status === "occupied" ? "text-primary" :
                    room.status === "reserved" ? "text-yellow-500" : "text-blue-500"
                  }`} />
                </div>

                <p className="font-display font-bold text-lg text-foreground text-center">R{room.room_number}</p>
                {room.label && <p className="text-xs text-muted-foreground text-center truncate">{room.label}</p>}

                <Badge className={`${config.color} w-full justify-center mt-2 text-xs`}>{config.label}</Badge>

                {/* QR expiry warning */}
                {expired && (
                  <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-destructive font-medium">
                    <RefreshCw className="w-3 h-3" /> QR Expired
                  </div>
                )}

                {/* Status buttons */}
                <div className="grid grid-cols-2 gap-1 mt-3">
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setStatus(room.id, key)}
                      className={`text-[10px] px-1.5 py-1 rounded-md border transition-all ${
                        room.status === key ? "border-foreground/20 bg-foreground/10 font-bold" : "border-border hover:border-foreground/20"
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-1 mt-3 justify-center">
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setQrRoom(room)}>
                    <QrCode className="w-3 h-3 mr-1" /> QR
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => copyBillLink(room)}>
                    <Link2 className="w-3 h-3 mr-1" /> Bill
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7 px-2" onClick={() => deleteRoom(room.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Modal */}
      {qrRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setQrRoom(null)}>
          <div className="bg-card rounded-xl border border-border p-6 shadow-xl max-w-sm w-full mx-4 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-lg text-foreground">Room {qrRoom.room_number} QR</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQrRoom(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {isQRExpired(qrRoom) && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-2 mb-3 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> QR expired — regenerate below
              </div>
            )}

            <div className="bg-white p-4 rounded-lg inline-block mb-3">
              <QRCodeCanvas
                id={`qr-room-${qrRoom.room_number}`}
                value={getMenuUrl(qrRoom)}
                size={200}
                level="H"
                includeMargin
              />
            </div>

            {qrRoom.qr_generated_at && (
              <p className="text-xs text-muted-foreground mb-3">
                Generated: {format(new Date(qrRoom.qr_generated_at), "dd MMM yyyy")}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex gap-2 justify-center">
                <Button variant="hero" size="sm" onClick={() => downloadQR(qrRoom.room_number)}>
                  <Download className="w-4 h-4 mr-1" /> Download
                </Button>
                <Button variant="outline" size="sm" onClick={() => copyLink(qrRoom)}>
                  <Copy className="w-4 h-4 mr-1" /> Copy Link
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => regenerateQR(qrRoom)}
                className="text-primary border-primary/30"
              >
                <RefreshCw className="w-4 h-4 mr-1" /> Regenerate QR (Monthly)
              </Button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerRooms;
