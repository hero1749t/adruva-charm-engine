import { Phone, Mail, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container-main section-padding pb-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <a href="#" className="font-display text-2xl font-bold">
              <span className="text-primary">Adruva</span>
              <span className="text-secondary-foreground"> Solution</span>
            </a>
            <p className="mt-4 text-secondary-foreground/60 text-sm leading-relaxed">
              Your digital partner for restaurants. We build websites, ordering systems & marketing that bring more customers to your door.
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4 text-secondary-foreground/80">
              Services
            </h4>
            <ul className="space-y-3">
              {["Restaurant Website", "Online Ordering", "WhatsApp Orders", "Google Maps SEO", "Social Media Ads", "AI Chatbot"].map(
                (item) => (
                  <li key={item}>
                    <a href="#services" className="text-sm text-secondary-foreground/60 hover:text-primary transition-colors">
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4 text-secondary-foreground/80">
              We Serve
            </h4>
            <ul className="space-y-3">
              {["Restaurants", "Cafes", "Hotels", "Cloud Kitchens", "Food Brands", "Dhabas"].map(
                (item) => (
                  <li key={item}>
                    <span className="text-sm text-secondary-foreground/60">
                      {item}
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4 text-secondary-foreground/80">
              Contact
            </h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-sm text-secondary-foreground/60">
                <Phone className="w-4 h-4 text-primary" />
                +91 98765 43210
              </li>
              <li className="flex items-center gap-3 text-sm text-secondary-foreground/60">
                <Mail className="w-4 h-4 text-primary" />
                hello@adruva.in
              </li>
              <li className="flex items-start gap-3 text-sm text-secondary-foreground/60">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                India
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-secondary-foreground/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-secondary-foreground/40">
            © 2026 Adruva Solution. All rights reserved. Built for Bharat 🇮🇳
          </p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Service"].map((item) => (
              <a
                key={item}
                href="#"
                className="text-xs text-secondary-foreground/40 hover:text-primary transition-colors"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
