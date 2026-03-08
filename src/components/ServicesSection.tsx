import { motion } from "framer-motion";
import { Globe, UtensilsCrossed, ShoppingCart, MessageCircle, Search, CheckCircle2 } from "lucide-react";

const services = [
  {
    icon: Globe,
    title: "Restaurant Website",
    description: "Professional, mobile-friendly website with menu, photos, location & contact info.",
  },
  {
    icon: UtensilsCrossed,
    title: "Digital Menu",
    description: "QR code-based digital menu with photos, categories & real-time updates.",
  },
  {
    icon: ShoppingCart,
    title: "Online Order Button",
    description: "Let customers order directly. No commissions. Full control over your orders.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Ordering",
    description: "Customers order via WhatsApp — simple, fast, and familiar.",
  },
  {
    icon: Search,
    title: "Google SEO Setup",
    description: "Get found on Google Maps when people search for restaurants nearby.",
  },
];

const ServicesSection = () => {
  return (
    <section id="services" className="section-padding bg-background">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-red-brand-light text-primary text-sm font-semibold tracking-wide uppercase">
            What We Build
          </span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Everything Your Restaurant{" "}
            <span className="gradient-text">Needs Online</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            From website to marketing — we handle your restaurant's complete digital presence
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="p-7 rounded-2xl bg-card shadow-card hover:shadow-card-hover transition-all group border border-transparent hover:border-primary/20"
            >
              <div className="w-12 h-12 rounded-xl bg-red-brand-light flex items-center justify-center mb-5 group-hover:bg-primary transition-colors duration-300">
                <service.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">
                {service.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}

          {/* CTA card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="p-7 rounded-2xl bg-secondary text-secondary-foreground flex flex-col justify-center items-center text-center gap-4"
          >
            <CheckCircle2 className="w-10 h-10 text-primary" />
            <h3 className="font-display text-xl font-bold">Ready to go digital?</h3>
            <p className="text-secondary-foreground/60 text-sm">Get your restaurant online in 3-5 days</p>
            <button
              onClick={() => document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm hover:bg-red-brand-hover transition-colors shadow-button"
            >
              Get Started Free
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
