import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { useState } from "react";
import testimonial1 from "@/assets/testimonial-1.jpg";
import testimonial2 from "@/assets/testimonial-2.jpg";
import testimonial3 from "@/assets/testimonial-3.jpg";

const testimonials = [
  {
    name: "Rajesh Sharma",
    role: "Owner, Sharma Ji Ka Dhaba",
    location: "Indore",
    image: testimonial1,
    quote:
      "Pehle sab kuch kagaz pe hota tha — galat orders, confusion, aur daily revenue ka koi idea nahi. Adruvaa lagane ke 2 hafte mein sab badal gaya. Ab customer khud QR scan karke order karta hai, aur mujhe dashboard pe sab dikhta hai. Meri staff ki efficiency 2x ho gayi!",
    rating: 5,
  },
  {
    name: "Sunita Patil",
    role: "Owner, Chai & More Cafe",
    location: "Pune",
    image: testimonial2,
    quote:
      "Mujhe technology ka zyada pata nahi tha, but Adruvaa itna simple hai ki maine khud 1 ghante mein setup kar liya. Menu upload kiya, QR generate kiye, aur bass! Customers ko bahut pasand aaya digital menu. Ab WhatsApp pe bhi order confirmation jaata hai — bahut professional lagta hai.",
    rating: 5,
  },
  {
    name: "Mohan Reddy",
    role: "Owner, Reddy's Kitchen",
    location: "Hyderabad",
    image: testimonial3,
    quote:
      "Pehle kitchen mein chillaake order batana padta tha. Ab sab screen pe dikhta hai — table number, items, sab kuch. Galat order deliver hona band ho gaya hai completely. Analytics se mujhe pata chala ki biryani mera top seller hai — toh maine uska stock badha diya. Revenue 30% badh gaya!",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  const [active, setActive] = useState(0);

  return (
    <section className="section-padding bg-background overflow-hidden">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-red-brand-light text-primary text-sm font-semibold tracking-wide uppercase">
            Customer Stories
          </span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Restaurant owners jo{" "}
            <span className="text-primary">Adruvaa</span> pe bharosa karte hain
          </h2>
        </motion.div>

        {/* Featured testimonial */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-center mb-12"
        >
          {/* Image */}
          <div className="lg:col-span-2 flex justify-center">
            <div className="relative">
              <img
                src={testimonials[active].image}
                alt={testimonials[active].name}
                className="w-64 h-64 md:w-80 md:h-80 rounded-2xl object-cover shadow-card-hover"
              />
              <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
                <Quote className="w-7 h-7 text-primary-foreground" />
              </div>
            </div>
          </div>

          {/* Quote */}
          <div className="lg:col-span-3">
            <div className="flex gap-1 mb-4">
              {Array.from({ length: testimonials[active].rating }).map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-primary text-primary" />
              ))}
            </div>
            <blockquote className="text-lg md:text-xl text-foreground leading-relaxed italic">
              "{testimonials[active].quote}"
            </blockquote>
            <div className="mt-6">
              <p className="font-display font-bold text-lg text-foreground">
                {testimonials[active].name}
              </p>
              <p className="text-muted-foreground">
                {testimonials[active].role} · {testimonials[active].location}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Selector dots + thumbnails */}
        <div className="flex items-center justify-center gap-6">
          {testimonials.map((t, i) => (
            <button
              key={t.name}
              onClick={() => setActive(i)}
              className={`relative rounded-full overflow-hidden transition-all duration-300 ${
                active === i
                  ? "w-16 h-16 ring-4 ring-primary ring-offset-2 ring-offset-background"
                  : "w-12 h-12 opacity-50 hover:opacity-80"
              }`}
            >
              <img
                src={t.image}
                alt={t.name}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
