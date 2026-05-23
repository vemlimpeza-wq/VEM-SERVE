import React, { useState, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Philosophy from './components/Philosophy';
import Protocol from './components/Protocol';
import Footer from './components/Footer';
import QuoteModal from './components/QuoteModal';

gsap.registerPlugin(ScrollTrigger);

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Basic smooth scroll setup for GSAP if needed
    let ctx = gsap.context(() => {
      // Global animations or scroll triggers can be initialized here
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="relative min-h-screen">
      <Navbar onOpenModal={() => setIsModalOpen(true)} />
      
      <main>
        <Hero onOpenModal={() => setIsModalOpen(true)} />
        <Features />
        <Philosophy />
        <Protocol />
      </main>

      <Footer />

      <QuoteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

export default App;
