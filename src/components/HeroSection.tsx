import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.15, ease: "easeOut" as const },
  }),
};

const HeroSection = () => {
  const { t } = useLanguage();
  const stats = [
    { value: "50+", label: t("hero.stat.restaurants") },
    { value: "2x", label: t("hero.stat.orders") },
    { value: "₹5K", label: t("hero.stat.price") },
  ];

  return (
    <section className="relative flex min-h-[90vh] items-center overflow-hidden bg-secondary">
      <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[hsl(25,95%,53%)]/10 blur-[100px]" />
      <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-secondary-foreground/5" />

      <div className="container-main relative z-10 px-4 pb-16 pt-28 md:px-8 md:pb-24 md:pt-32">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-secondary-foreground/10 bg-secondary-foreground/5 px-4 py-2"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="text-sm text-secondary-foreground/70">{t("hero.badge")}</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="font-display text-4xl font-bold leading-[1.1] text-secondary-foreground sm:text-5xl md:text-6xl lg:text-7xl"
          >
            {t("hero.titlePrefix")} <span className="gradient-text">{t("hero.titleHighlight")}</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-secondary-foreground/60 md:text-xl"
          >
            {t("hero.description")}
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button
              variant="hero"
              size="lg"
              className="h-14 gap-2 rounded-xl px-8 text-base"
              onClick={() => document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" })}
            >
              {t("hero.primaryCta")}
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              variant="hero-outline"
              size="lg"
              className="h-14 gap-2 rounded-xl px-8 text-base"
              onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Play className="h-4 w-4" />
              {t("hero.secondaryCta")}
            </Button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-8"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-2xl font-bold text-primary md:text-3xl">{stat.value}</p>
                <p className="mt-1 text-xs text-secondary-foreground/40 md:text-sm">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
