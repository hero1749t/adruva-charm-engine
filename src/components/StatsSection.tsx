import { motion } from "framer-motion";

const stats = [
  { value: "90", suffix: "sec", label: "Mein order place" },
  { value: "0", suffix: "%", label: "Processing errors" },
  { value: "1", suffix: "hr", label: "Mein setup complete" },
  { value: "100", suffix: "%", label: "Digital orders" },
];

const StatsSection = () => {
  return (
    <section className="section-padding bg-secondary">
      <div className="container-main">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="font-display text-5xl md:text-6xl font-bold text-primary">
                {stat.value}
                <span className="text-3xl text-secondary-foreground/60">{stat.suffix}</span>
              </div>
              <p className="mt-2 text-secondary-foreground/70 font-medium">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
