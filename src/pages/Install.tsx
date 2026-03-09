import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, CheckCircle2, Share } from "lucide-react";
import { motion } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  if (isStandalone || installed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">App Installed! 🎉</h1>
          <p className="text-muted-foreground">Adruva Resto aapke home screen pe ready hai.</p>
          <Button variant="hero" className="mt-6" onClick={() => window.location.href = "/owner/dashboard"}>
            Open Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-sm w-full text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Smartphone className="w-10 h-10 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Install Adruvaa</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Apne phone ke home screen pe add karo — instant access, fast loading, offline support.
        </p>

        {/* Android / Chrome install */}
        {deferredPrompt && (
          <Button variant="hero" size="lg" className="w-full gap-2 mb-4" onClick={handleInstall}>
            <Download className="w-5 h-5" /> Install App
          </Button>
        )}

        {/* iOS instructions */}
        {isIOS && !deferredPrompt && (
          <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-3">
            <p className="font-semibold text-foreground text-sm">iPhone pe install karne ke liye:</p>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Share className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Safari mein neeche <strong className="text-foreground">Share</strong> button tap karo
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm">➕</span>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">"Add to Home Screen"</strong> tap karo
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">"Add"</strong> tap karo — done!
              </p>
            </div>
          </div>
        )}

        {/* Fallback for other browsers */}
        {!deferredPrompt && !isIOS && (
          <div className="bg-card border border-border rounded-2xl p-5 text-left">
            <p className="font-semibold text-foreground text-sm mb-2">Install karne ke liye:</p>
            <p className="text-sm text-muted-foreground">
              Browser menu (⋮) kholke <strong className="text-foreground">"Install app"</strong> ya <strong className="text-foreground">"Add to Home Screen"</strong> choose karo.
            </p>
          </div>
        )}

        <div className="mt-8 space-y-2">
          {[
            "⚡ Instant loading — no waiting",
            "📴 Works offline",
            "🔔 Order notifications",
            "📱 Feels like a real app",
          ].map((feature) => (
            <p key={feature} className="text-xs text-muted-foreground">{feature}</p>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Install;
