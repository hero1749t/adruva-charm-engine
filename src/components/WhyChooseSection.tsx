import { motion } from "framer-motion";
import { TrendingUp, Eye, HeadphonesIcon, IndianRupee } from "lucide-react";

const benefits = [
  { icon: TrendingUp, title: "More Online Orders", description: "Direct ordering system means no commissions to Zomato/Swiggy" },
  { icon: Eye, title: "Better Google Visibility", description: "SEO optimized website + Google Maps listing = more customers finding you" },
  { icon: HeadphonesIcon, title: "Automated Customer Support", description: "AI chatbot handles reservations, queries & orders 24/7" },
  { icon: IndianRupee, title: "Affordable Pricing", description: "Starting at just ₹5,000 — fraction of what agencies charge" },
];

const WhyChooseSection = () => {
  return (
    <section id="why-choose" className="section-padding bg-muted">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-red-brand-light text-primary text-sm font-semibold tracking-wide uppercase">
            Why Adruva Resto
          </span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Why Restaurant Owners{" "}
            <span className="gradient-text">Choose Adruva Resto</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {benefits.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="flex gap-5 p-6 rounded-2xl bg-card shadow-card hover:shadow-card-hover transition-all border border-transparent hover:border-primary/20"
            >
              <div className="w-12 h-12 rounded-xl bg-red-brand-light flex items-center justify-center flex-shrink-0">
                <benefit.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-foreground mb-1">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseSection;
