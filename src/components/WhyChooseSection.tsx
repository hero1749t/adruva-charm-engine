import { motion } from "framer-motion";
import { TrendingUp, Eye, HeadphonesIcon, IndianRupee, AlertTriangle } from "lucide-react";

const problems = [
  "Low online visibility — customers can't find you",
  "No website — losing to competitors who have one",
  "No online ordering — missing delivery & takeaway revenue",
  "No marketing — relying only on walk-ins",
];

const benefits = [
  { icon: TrendingUp, title: "More Online Orders", description: "Direct ordering system means no commissions to Zomato/Swiggy" },
  { icon: Eye, title: "Better Google Ranking", description: "SEO optimized website + Google Maps listing = more customers finding you" },
  { icon: HeadphonesIcon, title: "Automated Customer Support", description: "AI chatbot handles reservations, queries & orders 24/7" },
  { icon: IndianRupee, title: "Affordable Pricing", description: "Starting at just ₹5,000 — fraction of what agencies charge" },
];

const WhyChooseSection = () => {
  return (
    <section id="why-choose" className="section-padding bg-background">
      <div className="container-main">
        {/* Problem Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-semibold tracking-wide uppercase mb-4">
                The Problem
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight">
                Most restaurants <span className="text-primary">struggle online</span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                In today's digital world, if your restaurant isn't online, you're losing customers every single day.
              </p>
            </div>
            <div className="space-y-4">
              {problems.map((problem, i) => (
                <motion.div
                  key={problem}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-destructive/5 border border-destructive/10"
                >
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{problem}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Solution / Why Choose */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-red-brand-light text-primary text-sm font-semibold tracking-wide uppercase">
            The Solution
          </span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Why Restaurants Choose{" "}
            <span className="text-primary">Adruva</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {benefits.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex gap-5 p-6 rounded-2xl bg-card shadow-card hover:shadow-card-hover transition-shadow"
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
