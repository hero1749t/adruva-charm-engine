import { motion } from "framer-motion";
import { QrCode, ShoppingCart, CreditCard, Bell } from "lucide-react";

const steps = [
  {
    icon: QrCode,
    step: "01",
    title: "QR Code Scan",
    description: "Customer table pe QR scan karta hai — browser mein menu khul jaata hai",
  },
  {
    icon: ShoppingCart,
    step: "02",
    title: "Order Place",
    description: "Items choose karo, cart mein daalo, phone number do aur order karo",
  },
  {
    icon: CreditCard,
    step: "03",
    title: "UPI se Pay",
    description: "UPI QR se turant payment ya 'Pay at Counter' option choose karo",
  },
  {
    icon: Bell,
    step: "04",
    title: "Owner ko Alert",
    description: "Owner ke dashboard pe order turant dikhta hai — kitchen mein bhi!",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.15, ease: "easeOut" as const },
  }),
};

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="section-padding bg-cream">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-red-brand-light text-primary text-sm font-semibold tracking-wide uppercase">
            How It Works
          </span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            4 simple steps mein sab{" "}
            <span className="text-primary">digital</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              custom={i}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="relative bg-card rounded-2xl p-8 shadow-card hover:shadow-card-hover transition-shadow text-center group cursor-pointer"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                {step.step}
              </div>
              <div className="w-16 h-16 rounded-2xl bg-red-brand-light flex items-center justify-center mx-auto mt-4 mb-6 group-hover:bg-primary transition-colors duration-300">
                <step.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
