import React from 'react';
import './styles/tokens.css';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ValueProposition } from './components/ValueProposition';
import { BentoCarousel } from './components/BentoCarousel';
import { MobileShowcase } from './components/MobileShowcase';
import { SimulatorSection } from './components/SimulatorSection';
import { Footer } from './components/Footer';

export function App() {
  return (
    <div className="min-h-screen bg-proofly-canvas text-proofly-black flex flex-col selection:bg-proofly-lavender selection:text-proofly-electric">
      {/* Sticky Modern Navbar */}
      <Navbar />

      {/* Main Single Page Experience */}
      <main className="flex-1 w-full overflow-x-hidden space-y-4">
        {/* Hero Section with Scaled Canvas & Floating Badges */}
        <Hero />

        {/* Value Proposition (Dual Model: Freelancer vs Client) */}
        <ValueProposition />

        {/* Bento Track: 01-06 Everything in One Place */}
        <BentoCarousel />

        {/* 3-Screen Mobile Showcase (Direct Match with Reference Aesthetic) */}
        <MobileShowcase />

        {/* Interactive COP & Tier Liquidity Simulator */}
        <SimulatorSection />
      </main>

      {/* Minimalist Footing */}
      <Footer />
    </div>
  );
}

export default App;
