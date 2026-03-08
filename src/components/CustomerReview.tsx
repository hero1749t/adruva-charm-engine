import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Star, Send, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CustomerReviewProps {
  orderId: string;
  ownerId: string;
  onSubmitted: () => void;
}

const CustomerReview = ({ orderId, ownerId, onSubmitted }: CustomerReviewProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ownerReply, setOwnerReply] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for owner reply after submission
  useEffect(() => {
    if (!reviewId) return;
    const checkReply = async () => {
      const { data } = await supabase
        .from("customer_reviews")
        .select("owner_reply")
        .eq("id", reviewId)
        .single();
      if (data?.owner_reply) {
        setOwnerReply(data.owner_reply);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    };
    checkReply();
    pollRef.current = setInterval(checkReply, 15000); // check every 15s
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [reviewId]);

  const submit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.from("customer_reviews").insert({
      order_id: orderId,
      owner_id: ownerId,
      rating,
      comment: comment.trim() || null,
      customer_name: name.trim() || null,
    }).select("id").single();

    if (error) {
      toast.error("Failed to submit review");
    } else {
      toast.success("Thank you for your feedback! 🙏");
      setSubmitted(true);
      if (data) setReviewId(data.id);
      onSubmitted();
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-4 bg-card border border-border rounded-2xl p-5 shadow-card text-center"
      >
        <span className="text-3xl">🎉</span>
        <p className="font-semibold text-foreground mt-2">Thanks for your review!</p>
        <div className="flex justify-center mt-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className={`w-5 h-5 ${s <= rating ? "text-yellow-400 fill-yellow-400" : "text-border"}`} />
          ))}
        </div>

        {/* Owner reply */}
        <AnimatePresence>
          {ownerReply && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-left bg-muted/50 border border-border rounded-xl p-3"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">Restaurant replied</span>
              </div>
              <p className="text-sm text-foreground">{ownerReply}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {!ownerReply && (
          <p className="text-xs text-muted-foreground mt-3">The restaurant may reply to your feedback</p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-4 bg-card border border-border rounded-2xl p-5 shadow-card"
    >
      <p className="font-semibold text-foreground text-sm mb-3">How was your experience?</p>

      {/* Star rating */}
      <div className="flex gap-1 mb-4 justify-center">
        {[1, 2, 3, 4, 5].map((s) => (
          <motion.button
            key={s}
            whileTap={{ scale: 1.3 }}
            onMouseEnter={() => setHoverRating(s)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(s)}
            className="p-1"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                s <= (hoverRating || rating)
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-border"
              }`}
            />
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {rating > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              className="h-10"
            />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us more (optional)..."
              maxLength={500}
              rows={2}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button
              variant="hero"
              className="w-full"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" /> Submit Review
                </span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CustomerReview;
