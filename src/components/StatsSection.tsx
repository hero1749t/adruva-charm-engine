import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const stats = [
  { value: 90, suffix: "sec", label: "Mein order place" },
  { value: 0, suffix: "%", label: "Processing errors" },
  { value: 1, suffix: "hr", label: "Mein setup complete" },
  { value: 100, suffix: "%", label: "Digital orders" },
];

const CountUp = ({ target, duration = 2 }: { target: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return <span ref={ref}>{count}</span>;
};

const StatsSection = () => {
  return (
    <section className="section-padding bg-secondary">
      <div className="container-main">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-center"
            >
              <div className="font-display text-5xl md:text-6xl font-bold text-primary">
                <CountUp target={stat.value} duration={1.5} />
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
