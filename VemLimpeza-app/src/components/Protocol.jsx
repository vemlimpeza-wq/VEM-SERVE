import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const Protocol = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.protocol-card');
      
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return; // don't animate the last card out
        
        gsap.to(card, {
          scale: 0.9,
          opacity: 0.5,
          filter: 'blur(10px)',
          scrollTrigger: {
            trigger: card,
            start: 'top top',
            end: 'bottom top',
            pin: true,
            pinSpacing: false,
            scrub: true,
          }
        });
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const protocols = [
    {
      step: '01',
      title: 'Diagnóstico e aspiração profunda',
      desc: 'Avaliação inicial do tecido seguida de aspiração profunda para remoção mecânica de detritos superficiais.',
      bg: 'bg-white',
      text: 'text-dark',
      Visual: () => (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-40 h-40 border-2 border-primary rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]">
            <div className="w-32 h-32 border border-dashed border-primary rounded-full"></div>
          </div>
        </div>
      )
    },
    {
      step: '02',
      title: 'Extração Profunda',
      desc: 'Utilização de equipamentos de última geração para enxaguar e extrair a sujidade que enfraquece a fibra do tecido.',
      bg: 'bg-background',
      text: 'text-dark',
      Visual: () => (
        <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
          <div className="grid grid-cols-5 gap-2 opacity-20">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-accent"></div>
            ))}
          </div>
          <div className="absolute top-0 left-0 w-full h-1 bg-accent shadow-[0_0_15px_rgba(27,176,206,1)] animate-[pulse_2s_ease-in-out_infinite]"></div>
        </div>
      )
    },
    {
      step: '03',
      title: 'Impermeabilização e Secagem',
      desc: 'Encapsulamento das fibras permitindo aos estofos respirar, finalizando com uma secagem otimizada.',
      bg: 'bg-dark',
      text: 'text-white',
      Visual: () => (
        <div className="w-full h-full flex items-center justify-center">
          <svg className="w-full h-32 text-secondary" viewBox="0 0 100 20" preserveAspectRatio="none">
            <path 
              d="M0,10 Q10,0 20,10 T40,10 T60,10 T80,10 T100,10" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className="animate-[pulse_3s_infinite]"
            />
          </svg>
        </div>
      )
    }
  ];

  return (
    <section id="processo" ref={containerRef} className="relative bg-dark">
      {protocols.map((protocol, index) => (
        <div 
          key={index} 
          className={`protocol-card relative h-screen w-full flex items-center ${protocol.bg} ${protocol.text} px-6 lg:px-20 border-b border-dark/5`}
        >
          <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="font-mono text-xl opacity-50 mb-6">STEP {protocol.step}</div>
              <h2 className="font-heading font-bold text-4xl md:text-6xl mb-6 tracking-tight">
                {protocol.title}
              </h2>
              <p className="font-sans text-lg md:text-xl opacity-80 max-w-lg leading-relaxed">
                {protocol.desc}
              </p>
            </div>
            <div className="h-64 lg:h-96 w-full rounded-[2rem] border border-current/10 flex items-center justify-center overflow-hidden">
              <protocol.Visual />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
};

export default Protocol;
