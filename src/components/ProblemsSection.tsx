import { motion } from "framer-motion";
import { Globe, ShoppingCart, Search, Smartphone } from "lucide-react";

const problems = [
  {
    icon: Globe,
    title: "No Website",
    description: "Customers can't find you online. You're invisible to the digital world.",
  },
  {
    icon: ShoppingCart,
    title: "No Online Ordering",
    description: "Missing out on delivery & takeaway revenue every single day.",
  },
  {
    icon: Search,
    title: "Low Google Visibility",
    description: "When people search 'restaurants near me', you don't show up.",
  },
  {
    icon: Smartphone,
    title: "Poor Digital Presence",
    description: "No social media, no reviews management, no digital marketing.",
  },
];

const ProblemsSection = () => {
  return (
    <section className="section-padding bg-muted">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-semibold tracking-wide uppercase">
            The Problem
          </span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Most Restaurants <span className="text-primary">Struggle Online</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            In today's digital world, if your restaurant isn't online, you're losing customers every single day.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, i) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative p-6 rounded-2xl bg-card border border-destructive/10 hover:border-destructive/30 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-5 group-hover:bg-destructive/20 transition-colors">
                <problem.icon className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">{problem.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{problem.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemsSection;
