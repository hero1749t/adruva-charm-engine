import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Smartphone, Gauge, Search, UtensilsCrossed, Eye, AlertTriangle, CheckCircle2, Loader2, ArrowRight, Lightbulb, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";

interface Category {
  name: string;
  score: number;
  maxScore: number;
  issues: string[];
  suggestions: string[];
}

interface AnalysisResult {
  overallScore: number;
  categories: Category[];
  url: string;
}

const categoryIcons: Record<string, typeof Globe> = {
  "Mobile Optimization": Smartphone,
  "Page Speed": Gauge,
  "SEO": Search,
  "Online Menu": UtensilsCrossed,
  "Google Visibility": Eye,
  "मोबाइल ऑप्टिमाइजेशन": Smartphone,
  "पेज स्पीड": Gauge,
  "ऑनलाइन मेन्यू": UtensilsCrossed,
  "Google visibility": Eye,
};

const ScanningAnimation = ({ url }: { url: string }) => {
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(0);
  const scanSteps = useMemo(
    () => [
      { icon: Globe, label: t("audit.step.fetch"), delay: 0 },
      { icon: Smartphone, label: t("audit.step.mobile"), delay: 1500 },
      { icon: Gauge, label: t("audit.step.speed"), delay: 3000 },
      { icon: Search, label: t("audit.step.seo"), delay: 4500 },
      { icon: UtensilsCrossed, label: t("audit.step.menu"), delay: 6000 },
      { icon: Eye, label: t("audit.step.visibility"), delay: 7500 },
      { icon: Shield, label: t("audit.step.report"), delay: 9000 },
    ],
    [t],
  );

  useEffect(() => {
    const timers = scanSteps.map((step, i) =>
      setTimeout(() => setActiveStep(i), step.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [scanSteps]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto mt-10"
    >
      {/* Scanning card */}
      <div className="relative bg-secondary-foreground/5 border border-secondary-foreground/10 rounded-2xl p-8 overflow-hidden">
        {/* Scanning line */}
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />

        {/* URL being scanned */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm font-medium text-primary">{t("audit.scanning")}</span>
          </div>
          <p className="text-xs text-secondary-foreground/40 font-mono">{url}</p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {scanSteps.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === activeStep;
            const isDone = i < activeStep;

            return (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: i <= activeStep ? 1 : 0.3,
                  x: 0,
                }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${
                  isActive ? "bg-primary/10" : ""
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isDone ? "bg-green-500/20" : isActive ? "bg-primary/20" : "bg-secondary-foreground/5"
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : isActive ? (
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                      <Icon className="w-4 h-4 text-primary" />
                    </motion.div>
                  ) : (
                    <Icon className="w-4 h-4 text-secondary-foreground/30" />
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  isDone ? "text-green-500" : isActive ? "text-secondary-foreground" : "text-secondary-foreground/30"
                }`}>
                  {step.label}
                </span>
                {isActive && (
                  <motion.div
                    className="ml-auto flex gap-1"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-6 w-full h-1.5 rounded-full bg-secondary-foreground/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: `${((activeStep + 1) / scanSteps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  );
};

const getScoreColor = (score: number, max: number) => {
  const pct = (score / max) * 100;
  if (pct >= 80) return "text-green-500";
  if (pct >= 50) return "text-yellow-500";
  return "text-primary";
};

const getOverallGrade = (score: number, t: (key: string) => string) => {
  if (score >= 80) return { label: t("audit.grade.great"), color: "text-green-500", bg: "bg-green-500" };
  if (score >= 60) return { label: t("audit.grade.good"), color: "text-yellow-500", bg: "bg-yellow-500" };
  if (score >= 40) return { label: t("audit.grade.needsWork"), color: "text-orange-500", bg: "bg-orange-500" };
  return { label: t("audit.grade.poor"), color: "text-primary", bg: "bg-primary" };
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const WebsiteScoreTool = () => {
  const { t } = useLanguage();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [scanUrl, setScanUrl] = useState("");

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);
    const formattedUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    setScanUrl(formattedUrl);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-website`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const rawBody = await response.text();
      const data = rawBody
        ? (JSON.parse(rawBody) as Partial<AnalysisResult> & { success?: boolean; error?: string })
        : null;

      if (!response.ok) {
        throw new Error(data?.error || `Request failed with status ${response.status}`);
      }

      if (!data?.success) throw new Error(data?.error || "Analysis failed");

      setResult(data as AnalysisResult);
    } catch (err) {
      console.error("Analysis error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const grade = result ? getOverallGrade(result.overallScore, t) : null;
  const categoryLabels: Record<string, string> = {
    "Mobile Optimization": t("audit.category.mobile"),
    "Page Speed": t("audit.category.speed"),
    SEO: t("audit.category.seo"),
    "Online Menu": t("audit.category.menu"),
    "Google Visibility": t("audit.category.visibility"),
  };

  return (
    <section id="website-score" className="section-padding bg-secondary">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wide uppercase">
            {t("audit.badge")}
          </span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-foreground">
            {t("audit.titlePrefix")}{" "}
            <span className="gradient-text">{t("audit.titleHighlight")}</span>
          </h2>
          <p className="mt-3 text-secondary-foreground/60 max-w-xl mx-auto">
            {t("audit.subtitle")}
          </p>
        </motion.div>

        {/* URL Input */}
        <motion.form
          onSubmit={handleAnalyze}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 mb-12"
        >
          <div className="flex-1 relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-foreground/30" />
            <Input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("audit.placeholder")}
              className="h-14 pl-12 pr-4 rounded-xl bg-secondary-foreground/5 border-secondary-foreground/10 text-secondary-foreground placeholder:text-secondary-foreground/30 focus:border-primary text-base"
              disabled={loading}
            />
          </div>
          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="h-14 px-8 rounded-xl text-base gap-2 shrink-0"
            disabled={loading || !url.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("audit.analyzing")}
              </>
            ) : (
              <>
                {t("audit.analyze")}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </motion.form>

        {/* Scanning Animation */}
        <AnimatePresence>
          {loading && <ScanningAnimation url={scanUrl} />}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto mb-8 p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto"
            >
              {/* Overall Score */}
              <div className="text-center mb-10">
                <div className="relative inline-flex items-center justify-center w-40 h-40 mb-4">
                  <svg className="w-40 h-40 -rotate-90" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r="56" fill="none" stroke="hsl(var(--secondary-foreground) / 0.1)" strokeWidth="10" />
                    <circle
                      cx="64" cy="64" r="56" fill="none"
                      stroke="currentColor"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${(result.overallScore / 100) * 352} 352`}
                      className={grade!.color}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`font-display text-4xl font-bold ${grade!.color}`}>
                      {result.overallScore}
                    </span>
                    <span className="text-xs text-secondary-foreground/50">/100</span>
                  </div>
                </div>
                <p className={`font-display text-xl font-bold ${grade!.color}`}>
                  {grade!.label}
                </p>
                <p className="text-sm text-secondary-foreground/50 mt-1">
                  {result.url}
                </p>
              </div>

              {/* Category Breakdown */}
              <div className="grid gap-4 mb-10">
                {result.categories.map((cat) => {
                  const Icon = categoryIcons[cat.name] || Globe;
                  const pct = Math.round((cat.score / cat.maxScore) * 100);
                  const isExpanded = expandedCat === cat.name;
                  const totalIssues = cat.issues.length;

                  return (
                    <motion.div
                      key={cat.name}
                      layout
                      className="bg-secondary-foreground/5 rounded-2xl border border-secondary-foreground/10 overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedCat(isExpanded ? null : cat.name)}
                        className="w-full p-5 flex items-center gap-4 text-left hover:bg-secondary-foreground/[0.03] transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-display font-bold text-secondary-foreground text-sm">
                              {categoryLabels[cat.name] || cat.name}
                            </span>
                            <span className={`font-display font-bold text-sm ${getScoreColor(cat.score, cat.maxScore)}`}>
                              {cat.score}/{cat.maxScore}
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-secondary-foreground/10 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                              className={`h-full rounded-full ${
                                pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-primary"
                              }`}
                            />
                          </div>
                        </div>
                        {totalIssues > 0 && (
                          <span className="shrink-0 text-xs text-secondary-foreground/40 font-medium">
                            {totalIssues} {totalIssues > 1 ? t("audit.issue.plural") : t("audit.issue.single")}
                          </span>
                        )}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (cat.issues.length > 0 || cat.suggestions.length > 0) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 space-y-3">
                              {cat.issues.map((issue, i) => (
                                <div key={i} className="flex gap-2 items-start text-sm">
                                  <AlertTriangle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                  <span className="text-secondary-foreground/70">{issue}</span>
                                </div>
                              ))}
                              {cat.suggestions.map((sug, i) => (
                                <div key={`s-${i}`} className="flex gap-2 items-start text-sm">
                                  <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                                  <span className="text-secondary-foreground/60">{sug}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center p-8 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
              >
                <h3 className="font-display text-xl md:text-2xl font-bold text-secondary-foreground mb-3">
                  {t("audit.ctaTitle")}
                </h3>
                <p className="text-secondary-foreground/60 text-sm mb-6 max-w-md mx-auto">
                  {t("audit.ctaDescription")}
                </p>
                <Button
                  variant="hero"
                  size="lg"
                  className="h-14 px-8 text-base rounded-xl gap-2"
                  onClick={() => document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" })}
                >
                  {t("audit.ctaButton")}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default WebsiteScoreTool;
