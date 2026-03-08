import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const CTASection = () => {
  const [formData, setFormData] = useState({ name: "", phone: "", restaurant: "" });

  return (
    <section id="pricing" className="section-padding bg-cream">
      <div className="container-main">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              Apna restaurant{" "}
              <span className="text-primary">aaj hi digital</span> banao
            </h2>
            <p className="mt-6 text-lg text-muted-foreground">
              Free demo le aur dekho kaise Adruvaa aapke restaurant ki operations ko simple bana deta hai. Koi commitment nahi, koi credit card nahi.
            </p>
            <div className="mt-8 space-y-4">
              {[
                "Setup under 1 hour — no IT person needed",
                "Customer ko koi app download nahi karna",
                "Works on any phone — owner & customer dono",
                "WhatsApp pe order confirmation",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary text-sm">✓</span>
                  </div>
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-card rounded-2xl shadow-card-hover p-8 md:p-10">
              <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                Free Demo Schedule Karo
              </h3>
              <p className="text-muted-foreground mb-8">
                Humari team aapko call karke demo degi
              </p>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <Input
                  placeholder="Aapka Naam"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12"
                />
                <Input
                  placeholder="Phone Number"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-12"
                />
                <Input
                  placeholder="Restaurant ka Naam"
                  value={formData.restaurant}
                  onChange={(e) => setFormData({ ...formData, restaurant: e.target.value })}
                  className="h-12"
                />
                <Button variant="hero" size="lg" className="w-full h-14 text-base">
                  Free Demo Book Karo
                </Button>
              </form>
              <p className="text-center text-xs text-muted-foreground mt-4">
                Koi cost nahi. Koi commitment nahi. Bas ek call.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
