import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageToggle({ className }: { className?: string }) {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className={`h-9 gap-2 px-3 text-muted-foreground hover:text-foreground ${className || ""}`}
      aria-label={language === "en" ? "Switch to Hindi" : "Switch to English"}
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-semibold">
        {language === "en" ? t("lang.label.hi") : t("lang.label.en")}
      </span>
    </Button>
  );
}

