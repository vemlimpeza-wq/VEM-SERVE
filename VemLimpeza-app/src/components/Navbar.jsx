import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

const Navbar = ({ onOpenModal }) => {
  const navRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        gsap.to(navRef.current, {
          backgroundColor: 'rgba(250, 248, 245, 0.95)', // Mais sólido ao rolar
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(26, 26, 26, 0.1)',
          duration: 0.4,
          ease: 'power2.out',
        });
      } else {
        gsap.to(navRef.current, {
          backgroundColor: 'rgba(255, 255, 255, 0.4)', // Levemente branco no topo
          backdropFilter: 'blur(8px)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          duration: 0.4,
          ease: 'power2.out',
        });
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full z-50 flex justify-center pt-6 px-4">
      <nav
        ref={navRef}
        className="flex items-center justify-between w-full max-w-5xl px-6 py-3 rounded-[2rem] border border-white/20 bg-white/40 backdrop-blur-md transition-colors"
      >
        <div className="flex items-center">
          <img src="/logo.jpg" alt="VEM Limpeza Logo" className="h-10 w-auto object-contain" />
        </div>
        
        <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-dark/80">
          <a href="#servicos" className="hover-lift hover:text-accent transition-colors">Serviços</a>
          <a href="#filosofia" className="hover-lift hover:text-accent transition-colors">Filosofia</a>
          <a href="#processo" className="hover-lift hover:text-accent transition-colors">O Processo</a>
        </div>

        <button
          onClick={onOpenModal}
          className="magnetic-btn bg-accent text-white px-6 py-2.5 rounded-full text-sm font-bold tracking-wide shadow-lg hover:shadow-xl hover:bg-accent/90"
        >
          Solicitar Orçamento
        </button>
      </nav>
    </div>
  );
};

export default Navbar;
