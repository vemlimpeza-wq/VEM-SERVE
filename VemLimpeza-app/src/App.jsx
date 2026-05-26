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
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const waParam = searchParams.get('wa');
  const sourceParam = searchParams.get('source');
  const botParam = searchParams.get('bot');
  const isStandaloneMode = !!waParam || sourceParam === 'whatsapp';

  const [isModalOpen, setIsModalOpen] = useState(isStandaloneMode);
  const [initialWhatsapp, setInitialWhatsapp] = useState(waParam || '');
  const [botWhatsapp, setBotWhatsapp] = useState(botParam || '');
  const [isWhatsappSource, setIsWhatsappSource] = useState(isStandaloneMode);

  useEffect(() => {
    // Basic smooth scroll setup for GSAP if needed
    let ctx = gsap.context(() => {
      // Global animations or scroll triggers can be initialized here
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="relative min-h-screen">
      {!isWhatsappSource && <Navbar onOpenModal={() => setIsModalOpen(true)} />}
      
      <main className={isWhatsappSource ? "hidden" : ""}>
        <Hero onOpenModal={() => setIsModalOpen(true)} />
        <Features />
        <Philosophy />
        <Protocol />
      </main>

      {!isWhatsappSource && <Footer />}

      <QuoteModal 
        isOpen={isModalOpen} 
        onClose={() => {
          if (!isWhatsappSource) setIsModalOpen(false);
        }} 
        initialWhatsapp={initialWhatsapp}
        isStandalone={isWhatsappSource}
        botWhatsapp={botWhatsapp}
      />
    </div>
  );
}

export default App;
