import { motion } from "framer-motion";
import { UtensilsCrossed, Coffee, Store, Truck, ChefHat, Soup } from "lucide-react";

const outlets = [
  { icon: UtensilsCrossed, label: "Restaurants" },
  { icon: Coffee, label: "Cafes" },
  { icon: Store, label: "Dhabas" },
  { icon: ChefHat, label: "Cloud Kitchens" },
  { icon: Soup, label: "Food Courts" },
  { icon: Truck, label: "Food Trucks" },
];

const OutletTypesSection = () => {
  return (
    <section id="outlet-types" className="section-padding bg-background">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-red-brand-light text-primary text-sm font-semibold tracking-wide uppercase">
            Outlet Types
          </span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Har type ke food business ke liye{" "}
            <span className="text-primary">built</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Chota dhaba ho ya bada restaurant — Adruvaa sabke liye kaam karta hai
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {outlets.map((outlet, i) => (
            <motion.div
              key={outlet.label}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
              whileHover={{ y: -6, scale: 1.05, transition: { duration: 0.25 } }}
              className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-card shadow-card hover:shadow-card-hover transition-shadow cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full bg-red-brand-light flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
                <outlet.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
              </div>
              <span className="font-display font-semibold text-foreground text-sm">
                {outlet.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OutletTypesSection;
