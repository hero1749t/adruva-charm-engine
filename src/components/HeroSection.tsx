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
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-secondary-foreground"
            >
              Apne Restaurant ko{" "}
              <span className="text-primary">Digital</span> banao,{" "}
              <br className="hidden md:block" />
              sirf 1 ghante mein!
            </motion.h1>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="mt-6 text-lg text-secondary-foreground/70 max-w-lg"
            >
              QR se menu, online orders, UPI payments aur live dashboard — sab kuch ek jagah. Koi app download nahi, koi training nahi.
            </motion.p>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="mt-8 flex flex-wrap gap-4"
            >
              <Button variant="hero" size="lg" className="h-14 px-8 text-base">
                Free Demo Le
              </Button>
              <Button variant="hero-outline" size="lg" className="h-14 px-8 text-base">
                Features Dekho
              </Button>
            </motion.div>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="mt-6 text-sm text-secondary-foreground/50"
            >
              ✓ Setup under 1 hour &nbsp; ✓ No hardware needed &nbsp; ✓ Free trial
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex justify-center"
          >
            <img
              src={heroImg}
              alt="Adruvaa restaurant digital ordering illustration"
              className="w-full max-w-lg animate-float"
            />
          </motion.div>
        </div>
      </div>

      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
    </section>
  );
};

export default HeroSection;
