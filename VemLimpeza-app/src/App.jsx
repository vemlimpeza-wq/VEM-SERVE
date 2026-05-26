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
  const [initialWhatsapp, setInitialWhatsapp] = useState('');
  const [isWhatsappSource, setIsWhatsappSource] = useState(false);

  useEffect(() => {
    // Basic smooth scroll setup for GSAP if needed
    let ctx = gsap.context(() => {
      // Global animations or scroll triggers can be initialized here
    });

    // Check URL parameters
    const params = new URLSearchParams(window.location.search);
    const wa = params.get('wa');
    const source = params.get('source');

    if (wa) {
      setInitialWhatsapp(wa);
      setIsModalOpen(true);
    }
    
    if (source === 'whatsapp' || wa) {
      setIsWhatsappSource(true);
    }

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
      />
    </div>
  );
}

export default App;
