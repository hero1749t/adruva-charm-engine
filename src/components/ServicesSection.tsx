import { motion } from "framer-motion";
import { Globe, ShoppingCart, MessageCircle, MapPin, Megaphone, Bot, UtensilsCrossed } from "lucide-react";

const services = [
  {
    icon: Globe,
    title: "Restaurant Website",
    description: "Professional, mobile-friendly website with menu, photos, location & contact — designed to convert visitors into customers.",
  },
  {
    icon: ShoppingCart,
    title: "Online Ordering System",
    description: "Let customers order directly from your website. No third-party commissions. Full control over your orders.",
  },
  {
    icon: MapPin,
    title: "Google Maps SEO",
    description: "Get found on Google Maps when people search for restaurants nearby. More visibility = more walk-ins.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Ordering",
    description: "Customers order via WhatsApp — simple, fast, and familiar. Auto-confirmation messages included.",
  },
  {
    icon: Megaphone,
    title: "Social Media Ads",
    description: "Targeted Instagram & Facebook ads to bring hungry customers to your restaurant. ROI-focused campaigns.",
  },
  {
    icon: Bot,
    title: "AI Chatbot for Reservations",
    description: "24/7 automated reservation booking and customer queries handled by AI. Never miss a customer again.",
  },
  {
    icon: UtensilsCrossed,
    title: "Digital Menu",
    description: "QR code-based digital menu with photos, categories & real-time updates. No app download needed.",
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
            Our Services
          </span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Everything Your Restaurant Needs{" "}
            <span className="text-primary">Online</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            From website to marketing — we handle your restaurant's complete digital presence
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="p-8 rounded-2xl bg-card shadow-card hover:shadow-card-hover transition-shadow group"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-brand-light flex items-center justify-center mb-6 group-hover:bg-primary transition-colors duration-300">
                <service.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-3">
                {service.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
