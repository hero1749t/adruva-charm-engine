import OwnerLayout from "@/components/OwnerLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Phone, Star, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface CustomerPhone {
  customer_phone: string;
  order_count: number;
  last_order: string;
  total_spent: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  customer_name: string | null;
  order_id: string;
  created_at: string;
  owner_reply: string | null;
}

const OwnerCustomers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerPhone[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("customer_phone, total_amount, created_at")
      .eq("owner_id", user.id)
      .not("customer_phone", "is", null)
      .order("created_at", { ascending: false });

    if (data) {
      const map = new Map<string, CustomerPhone>();
      data.forEach((order) => {
        const phone = order.customer_phone!;
        const existing = map.get(phone);
        if (existing) {
          existing.order_count += 1;
          existing.total_spent += order.total_amount;
          if (order.created_at > existing.last_order) existing.last_order = order.created_at;
        } else {
          map.set(phone, {
            customer_phone: phone,
            order_count: 1,
            last_order: order.created_at,
            total_spent: order.total_amount,
          });
        }
      });
      setCustomers(Array.from(map.values()).sort((a, b) => b.order_count - a.order_count));
    }
  };

  const fetchReviews = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("customer_reviews")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setReviews(data);
  };

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchCustomers(), fetchReviews()]).then(() => setLoading(false));
  }, [user]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground">Customer data & reviews</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{customers.length}</p>
                <p className="text-xs text-muted-foreground">Total Customers</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-accent/50">
                <Star className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{avgRating}</p>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-accent/50">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{reviews.length}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-accent/50">
                <Phone className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {customers.filter(c => c.order_count > 1).length}
                </p>
                <p className="text-xs text-muted-foreground">Repeat</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="phones" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-xs">
            <TabsTrigger value="phones">📱 Phone Numbers</TabsTrigger>
            <TabsTrigger value="reviews">⭐ Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="phones">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Phone Numbers</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Loading...</p>
                ) : customers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Abhi tak koi customer data nahi hai</p>
                ) : (
                  <>
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Phone</TableHead>
                            <TableHead>Orders</TableHead>
                            <TableHead>Total Spent</TableHead>
                            <TableHead>Last Order</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customers.map((c) => (
                            <TableRow key={c.customer_phone}>
                              <TableCell>
                                <a href={`tel:${c.customer_phone}`} className="text-primary hover:underline flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {c.customer_phone}
                                </a>
                              </TableCell>
                              <TableCell>
                                <Badge variant={c.order_count > 1 ? "default" : "secondary"}>
                                  {c.order_count}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">₹{c.total_spent}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {format(new Date(c.last_order), "dd MMM yyyy")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="sm:hidden space-y-3">
                      {customers.map((c) => (
                        <div key={c.customer_phone} className="border border-border rounded-xl p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <a href={`tel:${c.customer_phone}`} className="text-primary font-semibold flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5" />
                              {c.customer_phone}
                            </a>
                            <Badge variant={c.order_count > 1 ? "default" : "secondary"} className="text-xs">
                              {c.order_count} orders
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>₹{c.total_spent} spent</span>
                            <span>{format(new Date(c.last_order), "dd MMM")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Loading...</p>
                ) : reviews.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Abhi tak koi review nahi aaya</p>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((r) => (
                      <div key={r.id} className="border border-border rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {r.customer_name || "Anonymous"}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${i < r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(r.created_at), "dd MMM yyyy")}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="text-sm text-muted-foreground">{r.comment}</p>
                        )}
                        <p className="text-xs text-muted-foreground/70">
                          Order: {r.order_id.slice(0, 8)}...
                        </p>
                        {r.owner_reply && (
                          <div className="bg-accent/50 rounded-lg p-2.5 text-sm">
                            <span className="font-medium text-foreground">Your Reply:</span>{" "}
                            <span className="text-muted-foreground">{r.owner_reply}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </OwnerLayout>
  );
};

export default OwnerCustomers;
