import { motion, AnimatePresence } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import testimonial1 from "@/assets/testimonial-1.jpg";
import testimonial2 from "@/assets/testimonial-2.jpg";
import testimonial3 from "@/assets/testimonial-3.jpg";

const testimonials = [
  {
    name: "Rajesh Sharma",
    role: "Owner, Sharma Ji Ka Dhaba",
    location: "Indore",
    image: testimonial1,
    highlight: "Staff efficiency 2x ho gayi!",
    quote:
      "Pehle sab kuch kagaz pe hota tha — galat orders, confusion, aur daily revenue ka koi idea nahi. Adruva Resto lagane ke 2 hafte mein sab badal gaya. Ab customer khud QR scan karke order karta hai, aur mujhe dashboard pe sab dikhta hai.",
    rating: 5,
    metric: "2x",
    metricLabel: "Staff Efficiency",
  },
  {
    name: "Sunita Patil",
    role: "Owner, Chai & More Cafe",
    location: "Pune",
    image: testimonial2,
    highlight: "1 ghante mein setup ho gaya!",
    quote:
      "Mujhe technology ka zyada pata nahi tha, but Adruva Resto itna simple hai ki maine khud 1 ghante mein setup kar liya. Menu upload kiya, QR generate kiye, aur bass! Customers ko bahut pasand aaya digital menu.",
    rating: 5,
    metric: "1hr",
    metricLabel: "Setup Time",
  },
  {
    name: "Mohan Reddy",
    role: "Owner, Reddy's Kitchen",
    location: "Hyderabad",
    image: testimonial3,
    highlight: "Revenue 30% badh gaya!",
    quote:
      "Pehle kitchen mein chillaake order batana padta tha. Ab sab screen pe dikhta hai — table number, items, sab kuch. Galat order deliver hona band ho gaya hai completely. Analytics se mujhe pata chala ki biryani mera top seller hai!",
    rating: 5,
    metric: "30%",
    metricLabel: "Revenue Growth",
  },
];

const TestimonialsSection = () => {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % testimonials.length);
  }, []);

  const prev = useCallback(() => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [isPaused, next]);

  return (
    <section className="section-padding bg-muted/30 overflow-hidden">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-red-brand-light text-primary text-sm font-semibold tracking-wide uppercase">
            Customer Stories
          </span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Restaurant owners jo{" "}
            <span className="text-primary">Adruva Resto</span> pe bharosa karte hain
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Real results, real restaurant owners — unhi ki zubaani suniye
          </p>
        </motion.div>

        {/* Main testimonial card */}
        <div
          className="relative max-w-5xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="bg-card rounded-3xl shadow-card-hover border border-border/50 overflow-hidden"
            >
              <div className="grid md:grid-cols-5 gap-0">
                {/* Image side */}
                <div className="md:col-span-2 relative">
                  <img
                    src={testimonials[active].image}
                    alt={testimonials[active].name}
                    className="w-full h-64 md:h-full object-cover"
                  />
                  {/* Metric badge */}
                  <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 bg-primary text-primary-foreground rounded-2xl px-4 py-3 shadow-lg">
                    <p className="font-display text-2xl md:text-3xl font-bold leading-none">
                      {testimonials[active].metric}
                    </p>
                    <p className="text-xs mt-0.5 opacity-90">
                      {testimonials[active].metricLabel}
                    </p>
                  </div>
                </div>

                {/* Content side */}
                <div className="md:col-span-3 p-6 md:p-10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex gap-0.5">
                        {Array.from({ length: testimonials[active].rating }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                        ))}
                      </div>
                      <Quote className="w-8 h-8 text-primary/20 ml-auto" />
                    </div>

                    {/* Highlight */}
                    <p className="font-display font-bold text-xl md:text-2xl text-primary mb-4">
                      "{testimonials[active].highlight}"
                    </p>

                    <blockquote className="text-muted-foreground leading-relaxed text-sm md:text-base">
                      {testimonials[active].quote}
                    </blockquote>
                  </div>

                  <div className="mt-6 pt-6 border-t border-border/50 flex items-center justify-between">
                    <div>
                      <p className="font-display font-bold text-foreground">
                        {testimonials[active].name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {testimonials[active].role} · {testimonials[active].location}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          <button
            onClick={prev}
            className="absolute left-2 md:-left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card shadow-md border border-border/50 flex items-center justify-center hover:bg-muted transition-colors z-10"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 md:-right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card shadow-md border border-border/50 flex items-center justify-center hover:bg-muted transition-colors z-10"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-3 mt-8">
          {testimonials.map((t, i) => (
            <button
              key={t.name}
              onClick={() => setActive(i)}
              className="relative group"
              aria-label={`View ${t.name}'s testimonial`}
            >
              <div
                className={`rounded-full transition-all duration-300 ${
                  active === i
                    ? "w-10 h-2 bg-primary"
                    : "w-2 h-2 bg-border hover:bg-muted-foreground/40"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
