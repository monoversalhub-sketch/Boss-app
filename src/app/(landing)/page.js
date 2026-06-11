import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import PainSection from "@/components/landing/PainSection";
import SolutionSection from "@/components/landing/SolutionSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import MemorySection from "@/components/landing/MemorySection";
import GrowthSection from "@/components/landing/GrowthSection";
import ProofSection from "@/components/landing/ProofSection";
import FinalCTA from "@/components/landing/FinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "var(--font-plus-jakarta), sans-serif" }}>
      <LandingNav />
      <HeroSection />
      <PainSection />
      <SolutionSection />
      <HowItWorksSection />
      <MemorySection />
      <GrowthSection />
      <ProofSection />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
}
