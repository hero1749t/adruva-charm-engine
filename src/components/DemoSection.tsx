import { motion } from "framer-motion";
import { ExternalLink, Smartphone, Monitor } from "lucide-react";

const DemoSection = () => {
  return (
    <section id="demo" className="section-padding bg-muted">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-red-brand-light text-primary text-sm font-semibold tracking-wide uppercase">
            Live Demo
          </span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            See What Your Restaurant{" "}
            <span className="gradient-text">Website Looks Like</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Here's a preview of the kind of website we build for restaurants
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative max-w-4xl mx-auto"
        >
          {/* Browser frame */}
          <div className="rounded-2xl bg-card shadow-card-hover border border-border overflow-hidden">
            {/* Browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/40" />
                <div className="w-3 h-3 rounded-full bg-[hsl(45,80%,50%)]/40" />
                <div className="w-3 h-3 rounded-full bg-[hsl(120,40%,50%)]/40" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-background rounded-lg px-4 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
                  <span className="text-[hsl(120,40%,50%)]">🔒</span>
                  yourrestaurant.com
                </div>
              </div>
            </div>

            {/* Preview content */}
            <div className="aspect-video bg-secondary relative overflow-hidden">
              <video
                src="/hero-video.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-transparent to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                <p className="font-display text-xl md:text-2xl font-bold text-secondary-foreground">
                  Your Restaurant Name
                </p>
                <p className="text-sm text-secondary-foreground/60 mt-1">
                  Professional website with digital menu, online ordering & more
                </p>
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="absolute -left-4 md:-left-8 top-1/3 bg-card shadow-card-hover rounded-xl p-3 flex items-center gap-2 border border-border"
          >
            <Smartphone className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Mobile Ready</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="absolute -right-4 md:-right-8 top-1/2 bg-card shadow-card-hover rounded-xl p-3 flex items-center gap-2 border border-border"
          >
            <Monitor className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold text-foreground">SEO Optimized</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default DemoSection;
