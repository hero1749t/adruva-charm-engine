import { motion } from "framer-motion";
import featureMenu from "@/assets/feature-menu.png";
import featureDashboard from "@/assets/feature-dashboard.png";
import featurePayment from "@/assets/feature-payment.png";
import featureAnalytics from "@/assets/feature-analytics.png";

const features = [
  {
    tag: "DIGITAL MENU",
    title: "QR Scan karo, Menu dekho — No app download!",
    description:
      "Customer table pe QR scan karta hai aur turant digital menu khulta hai — photos, prices, categories ke saath. Koi app ya login ki zarurat nahi.",
    image: featureMenu,
    reverse: false,
  },
  {
    tag: "OWNER DASHBOARD",
    title: "Saare orders ek screen pe — real-time updates",
    description:
      "Naye orders turant dashboard pe dikhte hain table number ke saath. Ek tap mein status update karo — New → Preparing → Ready → Served.",
    image: featureDashboard,
    reverse: true,
  },
  {
    tag: "UPI PAYMENTS",
    title: "UPI se payment lo — bina kisi hardware ke",
    description:
      "Order ke baad UPI QR dikhao. Customer apne phone se pay kare ya counter pe — dono options available hain.",
    image: featurePayment,
    reverse: false,
  },
  {
    tag: "ANALYTICS",
    title: "Jaano apna business — daily revenue, top dishes, peak hours",
    description:
      "Daily revenue, top 5 dishes, total orders aur hourly graph — sab kuch ek nazar mein. Ab andhere mein restaurant mat chalao.",
    image: featureAnalytics,
    reverse: true,
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="section-padding bg-background">
      <div className="container-main">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-red-brand-light text-primary text-sm font-semibold tracking-wide uppercase">
            Smart Features
          </span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Aapke restaurant ki har zarurat,{" "}
            <span className="text-primary">ek jagah</span>
          </h2>
        </div>

        <div className="space-y-24">
          {features.map((feature, index) => (
            <motion.div
              key={feature.tag}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className={`grid lg:grid-cols-2 gap-12 items-center ${
                feature.reverse ? "lg:direction-rtl" : ""
              }`}
            >
              <div className={feature.reverse ? "lg:order-2" : ""}>
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
                  className="inline-flex items-center mt-6 text-primary font-semibold hover:underline"
                >
                  Explore features →
                </a>
              </div>
              <div className={feature.reverse ? "lg:order-1" : ""}>
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-full max-w-md mx-auto rounded-2xl shadow-card"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
