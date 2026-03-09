import { Phone, Mail, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container-main section-padding pb-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-1">
            <a href="#" className="font-display text-2xl font-bold">
              <span className="text-primary">Adruva</span>
              <span className="text-secondary-foreground"> Resto</span>
            </a>
            <p className="mt-4 text-secondary-foreground/50 text-sm leading-relaxed">
              Digital Marketing & Website Agency for restaurants. We help food businesses grow online.
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4 text-secondary-foreground/70">
              Services
            </h4>
            <ul className="space-y-3">
              {["Restaurant Website", "Digital Menu", "Online Ordering", "WhatsApp Orders", "Google SEO", "Social Media Ads"].map(
                (item) => (
                  <li key={item}>
                    <a href="#services" className="text-sm text-secondary-foreground/50 hover:text-primary transition-colors">
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4 text-secondary-foreground/70">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Pricing", href: "#pricing" },
                { label: "Why Adruva Resto", href: "#why-choose" },
                { label: "Contact Us", href: "#lead-form" },
              ].map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-sm text-secondary-foreground/50 hover:text-primary transition-colors">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4 text-secondary-foreground/70">
              Contact
            </h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-sm text-secondary-foreground/50">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <a href="tel:+918383877088" className="hover:text-primary transition-colors">+91 83838 77088</a>
              </li>
              <li className="flex items-center gap-3 text-sm text-secondary-foreground/50">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <a href="mailto:adruvaadsagency@gmail.com" className="hover:text-primary transition-colors">adruvaadsagency@gmail.com</a>
              </li>
              <li className="flex items-start gap-3 text-sm text-secondary-foreground/50">
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                India
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-secondary-foreground/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-secondary-foreground/30">
            © 2026 Adruva Solution. All rights reserved.
          </p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Service"].map((item) => (
              <a key={item} href="#" className="text-xs text-secondary-foreground/30 hover:text-primary transition-colors">
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
