import { motion } from "framer-motion";

const features = [
  {
    tag: "DIGITAL MENU",
    title: "QR Scan karo, Menu dekho — No app download!",
    description:
      "Customer table pe QR scan karta hai aur turant digital menu khulta hai — photos, prices, categories ke saath. Koi app ya login ki zarurat nahi.",
    video: "/feature-menu.mp4",
    reverse: false,
  },
  {
    tag: "OWNER DASHBOARD",
    title: "Saare orders ek screen pe — real-time updates",
    description:
      "Naye orders turant dashboard pe dikhte hain table number ke saath. Ek tap mein status update karo — New → Preparing → Ready → Served.",
    video: "/feature-dashboard.mp4",
    reverse: true,
  },
  {
    tag: "UPI PAYMENTS",
    title: "UPI se payment lo — bina kisi hardware ke",
    description:
      "Order ke baad UPI QR dikhao. Customer apne phone se pay kare ya counter pe — dono options available hain.",
    video: "/feature-payment.mp4",
    reverse: false,
  },
  {
    tag: "ANALYTICS",
    title: "Jaano apna business — daily revenue, top dishes, peak hours",
    description:
      "Daily revenue, top 5 dishes, total orders aur hourly graph — sab kuch ek nazar mein. Ab andhere mein restaurant mat chalao.",
    video: "/hero-video.mp4",
    reverse: true,
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const textVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const imageVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const FeaturesSection = () => {
  return (
    <section id="features" className="section-padding bg-background">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-red-brand-light text-primary text-sm font-semibold tracking-wide uppercase">
            Smart Features
          </span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Aapke restaurant ki har zarurat,{" "}
            <span className="text-primary">ek jagah</span>
          </h2>
        </motion.div>

        <div className="space-y-24">
          {features.map((feature) => (
            <motion.div
              key={feature.tag}
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="grid lg:grid-cols-2 gap-12 items-center"
            >
              <motion.div
                variants={textVariants}
                className={feature.reverse ? "lg:order-2" : ""}
              >
                <span className="inline-block px-3 py-1 rounded-md bg-red-brand-light text-primary text-xs font-bold tracking-wider uppercase">
                  {feature.tag}
                </span>
                <h3 className="mt-4 font-display text-2xl md:text-3xl font-bold text-foreground leading-tight">
                  {feature.title}
                </h3>
                <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                  {feature.description}
                </p>
                <a
                  href="#"
                  className="inline-flex items-center mt-6 text-primary font-semibold hover:underline transition-all"
                >
                  Explore features →
                </a>
              </motion.div>
              <motion.div
                variants={imageVariants}
                className={feature.reverse ? "lg:order-1" : ""}
              >
                <video
                  src={feature.video}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full max-w-md mx-auto rounded-2xl shadow-card hover:shadow-card-hover transition-shadow duration-300"
                />
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
