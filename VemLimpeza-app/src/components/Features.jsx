import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { ShieldAlert, Sparkles, Activity } from 'lucide-react';

const DiagnosticShuffler = () => {
  const items = [
    { label: 'Ácaros Removidos', value: '99.9%' },
    { label: 'Fungos Eliminados', value: 'Completo' },
    { label: 'Bactérias Neutralizadas', value: 'Ativo' },
  ];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-48 w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 flex flex-col justify-center">
      <div className="absolute top-4 right-4 text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">Diagnostic</div>
      <ShieldAlert className="text-primary w-8 h-8 mb-4" />
      <div className="relative h-12">
        {items.map((item, idx) => {
          const isActive = idx === activeIndex;
          const isPrev = idx === (activeIndex - 1 + items.length) % items.length;
          let y = isActive ? 0 : isPrev ? -30 : 30;
          let opacity = isActive ? 1 : 0;
          
          return (
            <div
              key={idx}
              className="absolute left-0 w-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{ transform: `translateY(${y}px)`, opacity }}
            >
              <div className="font-heading font-bold text-dark">{item.label}</div>
              <div className="font-mono text-sm text-secondary">{item.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TelemetryTypewriter = () => {
  const text = "Restaurando a textura original. Removendo manchas profundas. Revitalizando a cor base.";
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i));
      i++;
      if (i > text.length) {
        setTimeout(() => { i = 0; }, 2000);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-48 w-full bg-[#1A1A1A] rounded-2xl shadow-lg p-6 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-4">
        <Sparkles className="text-accent w-8 h-8" />
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
          <span className="text-xs font-mono text-accent">Live Feed</span>
        </div>
      </div>
      <div className="font-mono text-sm text-white/80 h-16">
        {displayedText}<span className="inline-block w-2 h-4 bg-accent ml-1 animate-pulse"></span>
      </div>
    </div>
  );
};

const CursorProtocolScheduler = () => {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const cursorRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });
      
      tl.set(cursorRef.current, { x: 0, y: 0, opacity: 0 })
        .to(cursorRef.current, { opacity: 1, duration: 0.3 })
        .to(cursorRef.current, { x: 120, y: 20, duration: 1, ease: 'power2.inOut' })
        .to(cursorRef.current, { scale: 0.8, duration: 0.1 })
        .to('.day-active', { backgroundColor: '#4EBA6F', color: 'white', duration: 0.2 }, "<")
        .to(cursorRef.current, { scale: 1, duration: 0.1 })
        .to(cursorRef.current, { x: 200, y: 60, duration: 1, delay: 0.5, ease: 'power2.inOut' })
        .to(cursorRef.current, { opacity: 0, duration: 0.3 });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative h-48 w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
      <div className="absolute top-4 right-4 text-xs font-mono text-secondary bg-secondary/10 px-2 py-1 rounded">Scheduler</div>
      <Activity className="text-secondary w-8 h-8 mb-4" />
      
      <div className="grid grid-cols-7 gap-1 mt-6">
        {days.map((d, i) => (
          <div key={i} className={`text-center font-mono text-xs py-1 rounded ${i === 3 ? 'day-active bg-gray-100 text-gray-400' : 'text-gray-400'}`}>
            {d}
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 bg-dark text-white text-[10px] px-3 py-1.5 rounded-full font-bold">
        Save
      </div>

      <svg ref={cursorRef} className="absolute top-4 left-4 w-6 h-6 text-dark drop-shadow-md z-10" fill="currentColor" viewBox="0 0 24 24">
        <path d="M7 2l12 11.2-5.8.5 3.3 7.3-2.2.9-3.2-7.4-4.4 4.8z"/>
      </svg>
    </div>
  );
};

const Features = () => {
  return (
    <section id="servicos" className="py-24 px-6 lg:px-20 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-dark mb-4">Artefatos de Limpeza</h2>
          <p className="text-dark/60 font-sans max-w-2xl text-lg">
            A nossa abordagem vai além da estética. Utilizamos processos precisos para prolongar a vida útil dos seus estofos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-4">
            <DiagnosticShuffler />
            <div>
              <h3 className="font-heading font-bold text-xl text-dark">Saúde em Primeiro Lugar</h3>
              <p className="text-sm text-dark/70 mt-2">Remoção implacável de 1 milhão de ácaros, fungos e vírus, com produtos aprovados pela ANVISA.</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <TelemetryTypewriter />
            <div>
              <h3 className="font-heading font-bold text-xl text-dark">Revitalização Profunda</h3>
              <p className="text-sm text-dark/70 mt-2">Extração de sujeiras impregnadas e odores, devolvendo o conforto original da trama.</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <CursorProtocolScheduler />
            <div>
              <h3 className="font-heading font-bold text-xl text-dark">Serviço Programado</h3>
              <p className="text-sm text-dark/70 mt-2">Atendimento ao domicílio agendado, com uma equipa altamente qualificada e equipada (EPIs).</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
