import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.15, ease: "easeOut" as const },
  }),
};

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-secondary pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="container-main px-4 md:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.span
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wide uppercase mb-6"
            >
              Your Digital Partner for Restaurants
            </motion.span>
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-secondary-foreground"
            >
              Grow Your Restaurant with{" "}
              <span className="text-primary">Adruva Solution</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="mt-6 text-lg text-secondary-foreground/70 max-w-lg"
            >
              We build high-converting restaurant websites, online ordering systems, and automated marketing to help your restaurant get more customers.
            </motion.p>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="mt-8 flex flex-wrap gap-4"
            >
              <Button variant="hero" size="lg" className="h-14 px-8 text-base" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>
                Get Your Restaurant Website
              </Button>
              <Button variant="hero-outline" size="lg" className="h-14 px-8 text-base" onClick={() => document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" })}>
                Free Consultation
              </Button>
            </motion.div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="mt-8 grid grid-cols-3 gap-6"
            >
              {[
                { value: "50+", label: "Restaurants Served" },
                { value: "2x", label: "More Online Orders" },
                { value: "₹5K", label: "Starting Price" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-display text-2xl md:text-3xl font-bold text-primary">{stat.value}</p>
                  <p className="text-sm text-secondary-foreground/50">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex justify-center"
          >
            <video
              src="/hero-video.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full max-w-lg rounded-2xl shadow-card"
            />
          </motion.div>
        </div>
      </div>

      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
    </section>
  );
};

export default HeroSection;
