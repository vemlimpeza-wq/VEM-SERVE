import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

const Hero = ({ onOpenModal }) => {
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        titleRef.current.children,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, stagger: 0.15, delay: 0.2 }
      )
      .fromTo(
        subtitleRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1 },
        "-=0.6"
      )
      .fromTo(
        ctaRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1 },
        "-=0.8"
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <section className="relative h-[100dvh] w-full flex items-end pb-24 lg:pb-32 px-6 lg:px-20 overflow-hidden">
      {/* Background Image & Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-bg.png"
          alt="Mr Cleaner - Antes e Depois da Higienização"
          className="w-full h-full object-cover"
        />
        {/* Gradient for text readability on the left */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A] via-[#1A1A1A]/80 to-transparent w-full md:w-3/4"></div>
        {/* Subtle bottom gradient for overall grounding */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#1A1A1A] to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-4xl">
        <h1 ref={titleRef} className="flex flex-col text-white mb-6">
          <span className="font-heading font-bold text-3xl md:text-5xl tracking-tight text-white/90">
            A precisão clínica encontra
          </span>
          <span className="font-drama italic text-6xl md:text-[7rem] leading-none text-primary">
            a renovação.
          </span>
        </h1>
        
        <p ref={subtitleRef} className="text-lg md:text-xl text-white/80 max-w-xl font-sans mb-10 leading-relaxed">
          O spa definitivo para os seus sofás e estofos. Elevamos a higienização a um padrão premium, eliminando bactérias e devolvendo a vitalidade ao seu lar.
        </p>

        <div ref={ctaRef}>
          <button
            onClick={onOpenModal}
            className="magnetic-btn bg-accent text-white px-8 py-4 rounded-[2rem] text-lg font-bold shadow-2xl hover:bg-accent/90"
          >
            Solicitar Análise Gratuita
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
