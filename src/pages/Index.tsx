import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import OutletTypesSection from "@/components/OutletTypesSection";
import StatsSection from "@/components/StatsSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <OutletTypesSection />
      <StatsSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
