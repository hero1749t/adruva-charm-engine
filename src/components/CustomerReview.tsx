import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Star, Send } from "lucide-react";
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

  const submit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("customer_reviews" as any).insert({
      order_id: orderId,
      owner_id: ownerId,
      rating,
      comment: comment.trim() || null,
      customer_name: name.trim() || null,
    } as any);

    if (error) {
      toast.error("Failed to submit review");
    } else {
      toast.success("Thank you for your feedback! 🙏");
      setSubmitted(true);
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
