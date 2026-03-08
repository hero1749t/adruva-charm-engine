import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-illustration.png";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-secondary pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="container-main px-4 md:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-secondary-foreground">
              Apne Restaurant ko{" "}
              <span className="text-primary">Digital</span> banao,{" "}
              <br className="hidden md:block" />
              sirf 1 ghante mein!
            </h1>
            <p className="mt-6 text-lg text-secondary-foreground/70 max-w-lg">
              QR se menu, online orders, UPI payments aur live dashboard — sab kuch ek jagah. Koi app download nahi, koi training nahi.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button variant="hero" size="lg" className="h-14 px-8 text-base">
                Free Demo Le
              </Button>
              <Button variant="hero-outline" size="lg" className="h-14 px-8 text-base">
                Features Dekho
              </Button>
            </div>
            <p className="mt-6 text-sm text-secondary-foreground/50">
              ✓ Setup under 1 hour &nbsp; ✓ No hardware needed &nbsp; ✓ Free trial
            </p>
          </motion.div>

          {/* Right illustration */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
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

      {/* Decorative circle */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
    </section>
  );
};

export default HeroSection;
