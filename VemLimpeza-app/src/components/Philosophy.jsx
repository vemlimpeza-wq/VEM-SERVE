import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const Philosophy = () => {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      // Parallax effect on the background image
      gsap.to('.parallax-bg', {
        y: '20%',
        ease: 'none',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });

      // Fade up the text lines
      gsap.fromTo(
        '.phil-text',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.2,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: textRef.current,
            start: 'top 80%',
          },
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="filosofia" ref={containerRef} className="relative py-32 px-6 lg:px-20 bg-dark overflow-hidden flex items-center min-h-[80vh]">
      {/* Background organic texture with parallax */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80"
          alt="Organic Texture"
          className="parallax-bg w-full h-[120%] object-cover opacity-10 absolute -top-[10%]"
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto w-full" ref={textRef}>
        <div className="phil-text mb-8">
          <p className="text-white/50 font-sans text-xl md:text-2xl font-light">
            A maioria da indústria foca em: <span className="text-white/80">descarte rápido e substituição de mobiliário.</span>
          </p>
        </div>
        
        <div className="phil-text">
          <p className="font-drama italic text-4xl md:text-6xl text-white leading-tight">
            Nós focamo-nos em: <span className="text-primary block mt-2">revitalização sustentável.</span>
          </p>
        </div>

        <div className="phil-text mt-12 max-w-2xl">
          <p className="text-white/60 font-sans leading-relaxed">
            Comprar novos estofos e descartar os antigos não faz bem à sua carteira nem ao meio ambiente. O spa do seu sofá existe para prolongar a vida útil do seu conforto.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Philosophy;
