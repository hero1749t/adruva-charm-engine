import { Phone, Mail, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container-main section-padding pb-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <a href="#" className="font-display text-2xl font-bold">
              <span className="text-primary">ADRU</span>
              <span className="text-secondary-foreground">vaa</span>
            </a>
            <p className="mt-4 text-secondary-foreground/60 text-sm leading-relaxed">
              Built for Bharat's restaurants. Chote se dhaba se lekar bade restaurant tak — sabko digital banao.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4 text-secondary-foreground/80">
              Product
            </h4>
            <ul className="space-y-3">
              {["Digital Menu", "QR Ordering", "Owner Dashboard", "UPI Payments", "Analytics", "Kitchen Display"].map(
                (item) => (
                  <li key={item}>
                    <a href="#features" className="text-sm text-secondary-foreground/60 hover:text-primary transition-colors">
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Outlet Types */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4 text-secondary-foreground/80">
              Outlet Types
            </h4>
            <ul className="space-y-3">
              {["Restaurants", "Cafes", "Dhabas", "Cloud Kitchens", "Food Courts", "Food Trucks"].map(
                (item) => (
                  <li key={item}>
                    <a href="#outlet-types" className="text-sm text-secondary-foreground/60 hover:text-primary transition-colors">
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Contact */}
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
                hello@adruvaa.in
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
            © 2026 Adruvaa. All rights reserved. Built for Bharat 🇮🇳
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
