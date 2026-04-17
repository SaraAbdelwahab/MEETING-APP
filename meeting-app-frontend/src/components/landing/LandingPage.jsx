import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import SocialProof from './SocialProof';
import Footer from './Footer';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing-page">
      <HeroSection />
      <FeaturesSection />
      <SocialProof />
      <Footer />
    </div>
  );
}
