import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

const CTASection = () => {
  const [formData, setFormData] = useState({ name: "", phone: "", restaurant: "", city: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.restaurant.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (formData.phone.trim().length < 10) {
      toast({ title: "Please enter a valid phone number", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.from("demo_requests").insert({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      restaurant_name: formData.restaurant.trim(),
      city: formData.city.trim() || null,
    });
    setIsSubmitting(false);
    if (error) {
      toast({ title: "Something went wrong", description: "Please try again", variant: "destructive" });
    } else {
      toast({ title: "Request submitted! 🎉", description: "Our team will call you within 24 hours" });
      setFormData({ name: "", phone: "", restaurant: "", city: "" });
    }
  };

  return (
    <section id="lead-form" className="section-padding bg-secondary relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[hsl(25,95%,53%)]/5 blur-[100px]" />

      <div className="container-main relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-foreground leading-tight">
              Get Your Restaurant{" "}
              <span className="gradient-text">Online Today</span>
            </h2>
            <p className="mt-6 text-lg text-secondary-foreground/60">
              Fill the form and get a free consultation. We'll analyze your restaurant's digital needs and suggest the best plan for you.
            </p>
            <div className="mt-8 space-y-4">
              {[
                "Free consultation — no commitment",
                "Website ready in 3-5 days",
                "Dedicated support manager",
                "100% satisfaction guarantee",
              ].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary text-sm">✓</span>
                  </div>
                  <span className="text-secondary-foreground/80">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          >
            <div className="bg-card rounded-2xl shadow-card-hover p-8 md:p-10 border border-border">
              <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                Get Free Consultation
              </h3>
              <p className="text-muted-foreground text-sm mb-8">
                Our team will call you within 24 hours
              </p>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <Input
                    placeholder="Restaurant Name *"
                    value={formData.restaurant}
                    onChange={(e) => setFormData({ ...formData, restaurant: e.target.value })}
                    className="h-12 rounded-xl bg-muted border-transparent focus:border-primary"
                    maxLength={200}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Owner Name *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12 rounded-xl bg-muted border-transparent focus:border-primary"
                    maxLength={100}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Phone Number *"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-12 rounded-xl bg-muted border-transparent focus:border-primary"
                    maxLength={15}
                  />
                </div>
                <div>
                  <Input
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="h-12 rounded-xl bg-muted border-transparent focus:border-primary"
                    maxLength={100}
                  />
                </div>
                <Button variant="hero" size="lg" className="w-full h-14 text-base rounded-xl gap-2" disabled={isSubmitting}>
                  <Send className="w-4 h-4" />
                  {isSubmitting ? "Submitting..." : "Get Free Consultation"}
                </Button>
              </form>
              <p className="text-center text-xs text-muted-foreground mt-4">
                No cost. No commitment. Just a call.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
