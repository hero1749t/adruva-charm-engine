import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Services", href: "#services" },
  { label: "Demo", href: "#demo" },
  { label: "Pricing", href: "#pricing" },
  { label: "Why Adruva", href: "#why-choose" },
  { label: "Contact", href: "#lead-form" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const scrollTo = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMobileOpen(false);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container-main flex items-center justify-between h-16 px-4 md:px-8">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="font-display text-xl font-bold tracking-tight"
        >
          <span className="text-primary">Adruva</span>
          <span className="text-foreground"> Resto</span>
        </a>

        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => scrollTo(e, link.href)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => navigate("/owner/login")}
          >
            Owner Login
          </Button>
          <Button
            variant="hero"
            size="default"
            className="rounded-lg"
            onClick={() => document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" })}
          >
            Free Consultation
          </Button>
        </div>

        <button
          className="lg:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden bg-background border-b border-border px-4 pb-4"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => scrollTo(e, link.href)}
              className="block py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-lg"
              onClick={() => { setMobileOpen(false); navigate("/owner/login"); }}
            >
              Owner Login
            </Button>
            <Button
              variant="hero"
              className="flex-1 rounded-lg"
              onClick={() => { setMobileOpen(false); document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" }); }}
            >
              Free Consultation
            </Button>
          </div>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;
