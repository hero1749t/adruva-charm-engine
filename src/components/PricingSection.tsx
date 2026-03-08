import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "₹5,000",
    description: "Perfect for small restaurants getting started online",
    features: [
      "Restaurant Website",
      "Mobile Friendly Design",
      "Menu Page with Photos",
      "Contact + Google Map",
      "WhatsApp Button",
    ],
    popular: false,
  },
  {
    name: "Growth",
    price: "₹10,000",
    description: "For restaurants ready to take online orders",
    features: [
      "Everything in Starter",
      "Online Ordering System",
      "WhatsApp Integration",
      "Basic SEO Setup",
      "Google Maps Listing",
      "Social Media Setup",
    ],
    popular: true,
  },
  {
    name: "Pro",
    price: "₹15,000",
    description: "Complete digital solution for serious restaurant owners",
    features: [
      "Everything in Growth",
      "AI Chatbot for Reservations",
      "Marketing Automation",
      "Google Ads Setup",
      "Instagram Ads Campaign",
      "Monthly Analytics Report",
      "Priority Support",
    ],
    popular: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="section-padding bg-cream">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-red-brand-light text-primary text-sm font-semibold tracking-wide uppercase">
            Pricing
          </span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Affordable Plans for{" "}
            <span className="text-primary">Every Restaurant</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            No hidden fees. No monthly charges. One-time investment for your restaurant's digital future.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className={`relative rounded-2xl p-8 ${
                plan.popular
                  ? "bg-secondary text-secondary-foreground shadow-card-hover ring-2 ring-primary scale-[1.02]"
                  : "bg-card shadow-card"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current" /> Most Popular
                </div>
              )}
              <h3 className="font-display text-xl font-bold">{plan.name}</h3>
              <div className="mt-4 mb-2">
                <span className="font-display text-4xl font-bold text-primary">{plan.price}</span>
                <span className={`text-sm ${plan.popular ? "text-secondary-foreground/60" : "text-muted-foreground"}`}> one-time</span>
              </div>
              <p className={`text-sm mb-6 ${plan.popular ? "text-secondary-foreground/70" : "text-muted-foreground"}`}>
                {plan.description}
              </p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.popular ? "hero" : "outline"}
                className="w-full h-12"
                onClick={() => document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" })}
              >
                Get Started
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
