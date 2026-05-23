import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-dark text-white rounded-t-[4rem] px-6 lg:px-20 py-16 mt-[-4rem] relative z-20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="flex flex-col mb-8 pb-8 md:border-b-0 border-b border-white/5 gap-6">
          <div className="flex items-center">
            <img src="/logo.jpg" alt="VEM Limpeza Logo" className="h-10 w-auto object-contain" />
          </div>
          <p className="font-sans text-white/60 max-w-sm">
            Inovamos na prestação de serviços de impermeabilização e higienização de estofados e tapetes residenciais e empresariais.
          </p>
          <div className="flex items-center space-x-3 bg-white/5 w-fit px-4 py-2 rounded-full border border-white/10 mt-4">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
            <span className="font-mono text-xs font-medium text-white/80">SYSTEM OPERATIONAL</span>
          </div>
        </div>

        <div>
          <h4 className="font-heading font-bold text-lg mb-6">Serviços</h4>
          <ul className="space-y-3 text-white/60 font-sans">
            <li className="hover:text-primary transition-colors cursor-pointer">Higienização de Estofados</li>
            <li className="hover:text-primary transition-colors cursor-pointer">Impermeabilização</li>
            <li className="hover:text-primary transition-colors cursor-pointer">Higienização de Tapetes</li>
            <li className="hover:text-primary transition-colors cursor-pointer">Cortinas e Persianas</li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading font-bold text-lg mb-6">Contato</h4>
          <ul className="space-y-3 text-white/60 font-sans">
            <li>(21) 99999-9999</li>
            <li>contato@vemlimpeza.com.br</li>
            <li className="mt-6 pt-6 border-t border-white/10 text-sm">
              &copy; {new Date().getFullYear()} VEM Limpeza.<br/>Todos os direitos reservados.
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
