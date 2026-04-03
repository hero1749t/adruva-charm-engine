import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Send } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const WHATSAPP_NUMBER = "918383877088";

const CTASection = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", restaurant: "", city: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openWhatsAppLead = () => {
    const message = [
      "New Adruva Resto lead",
      `Restaurant: ${formData.restaurant.trim()}`,
      `Owner: ${formData.name.trim()}`,
      `Email: ${formData.email.trim() || "Not provided"}`,
      `Phone: ${formData.phone.trim()}`,
      `City: ${formData.city.trim() || "Not provided"}`,
      "Source: Website free consultation form",
    ].join("\n");

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      window.location.href = whatsappUrl;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.restaurant.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (formData.phone.trim().length < 10) {
      toast({ title: "Please enter a valid phone number", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.from("demo_requests").insert({
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim(),
      restaurant_name: formData.restaurant.trim(),
      city: formData.city.trim() || null,
    });
    setIsSubmitting(false);
    if (error) {
      toast({ title: "Something went wrong", description: "Please try again", variant: "destructive" });
    } else {
      toast({ title: "Request submitted!", description: "Opening WhatsApp with your lead details" });
      openWhatsAppLead();
      setFormData({ name: "", email: "", phone: "", restaurant: "", city: "" });
    }
  };

  const points = [
    t("cta.point.free"),
    t("cta.point.fast"),
    t("cta.point.support"),
    t("cta.point.guarantee"),
  ];

  return (
    <section id="lead-form" className="section-padding relative overflow-hidden bg-secondary">
      <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-[hsl(25,95%,53%)]/5 blur-[100px]" />

      <div className="container-main relative z-10">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h2 className="font-display text-3xl font-bold leading-tight text-secondary-foreground md:text-4xl lg:text-5xl">
              {t("cta.titlePrefix")} <span className="gradient-text">{t("cta.titleHighlight")}</span>
            </h2>
            <p className="mt-6 text-lg text-secondary-foreground/60">
              {t("cta.description")}
            </p>
            <div className="mt-8 space-y-4">
              {points.map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <span className="text-sm text-primary">✓</span>
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
            <div className="rounded-2xl border border-border bg-card p-8 shadow-card-hover md:p-10">
              <h3 className="mb-2 font-display text-2xl font-bold text-foreground">
                {t("cta.formTitle")}
              </h3>
              <p className="mb-8 text-sm text-muted-foreground">
                {t("cta.formSubtitle")}
              </p>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                  placeholder={t("cta.placeholder.restaurant")}
                  value={formData.restaurant}
                  onChange={(e) => setFormData({ ...formData, restaurant: e.target.value })}
                  className="h-12 rounded-xl border-transparent bg-muted focus:border-primary"
                  maxLength={200}
                />
                <Input
                  placeholder={t("cta.placeholder.owner")}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 rounded-xl border-transparent bg-muted focus:border-primary"
                  maxLength={100}
                />
                <Input
                  placeholder="Owner email (optional)"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-12 rounded-xl border-transparent bg-muted focus:border-primary"
                  maxLength={200}
                />
                <Input
                  placeholder={t("cta.placeholder.phone")}
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-12 rounded-xl border-transparent bg-muted focus:border-primary"
                  maxLength={15}
                />
                <Input
                  placeholder={t("cta.placeholder.city")}
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="h-12 rounded-xl border-transparent bg-muted focus:border-primary"
                  maxLength={100}
                />
                <Button variant="hero" size="lg" className="h-14 w-full gap-2 rounded-xl text-base" disabled={isSubmitting}>
                  <Send className="h-4 w-4" />
                  {isSubmitting ? t("cta.submitting") : t("cta.submit")}
                </Button>
              </form>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                {t("cta.footer")}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
