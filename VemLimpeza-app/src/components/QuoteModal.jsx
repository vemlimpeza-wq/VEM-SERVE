import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import gsap from 'gsap';
import { X, ArrowRight, UploadCloud, CheckCircle2, Sofa, Bed, Sparkles, Grid } from 'lucide-react';
import { supabase } from '../supabaseClient';

const schemaTapete = z.object({
  comprimento: z.string().min(1, 'Obrigatório'),
  largura: z.string().min(1, 'Obrigatório'),
});

const schemaEstofado = schemaTapete;

const schemaContact = z.object({
  nome: z.string().min(2, 'Nome muito curto'),
  sobrenome: z.string().min(2, 'Sobrenome muito curto'),
  email: z.string().email('E-mail inválido'),
  whatsapp: z.string().min(9, 'WhatsApp inválido'),
});

// Google Apps Script url removida - Usando Supabase diretamente
const GOOGLE_SCRIPT_URL = '';

const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcular dimensões proporcionais
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Exportar como JPEG leve e comprimido
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        const rawBase64 = compressedBase64.split(',')[1];

        resolve({
          base64: compressedBase64,
          rawBase64: rawBase64,
          fileName: file.name.replace(/\.[^/.]+$/, "") + ".jpg", // Força extensão .jpg
          mimeType: 'image/jpeg'
        });
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const QuoteModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState(null); // 'tapete' | 'estofado'
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [photoData, setPhotoData] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [step2Data, setStep2Data] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalRef = useRef(null);
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  const { register: registerStep2, handleSubmit: handleSubmitStep2, formState: { errors: errors2 }, reset: resetStep2 } = useForm();
  const { register: registerStep3, handleSubmit: handleSubmitStep3, formState: { errors: errors3 }, reset: resetStep3 } = useForm({
    resolver: zodResolver(schemaContact)
  });

  // Handle Entrance/Exit animation
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(modalRef.current, { y: 50, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out' });
      gsap.fromTo(contentRef.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.3, delay: 0.2 });
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isOpen, step]);

  const handleClose = () => {
    gsap.to(modalRef.current, { y: 20, opacity: 0, scale: 0.95, duration: 0.3 });
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.3, onComplete: () => {
      onClose();
      setTimeout(() => {
        setStep(1);
        setServiceType(null);
        setPhotoUploaded(false);
        setPhotoData(null);
        setIsSuccess(false);
        setStep2Data(null);
        setIsSubmitting(false);
        resetStep2();
        resetStep3();
      }, 300);
    }});
  };

  const handleSelectService = (type) => {
    setServiceType(type);
    gsap.to(contentRef.current, { opacity: 0, x: -20, duration: 0.2, onComplete: () => setStep(2) });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Comprime a imagem no navegador reduzindo-a a no máximo 1200px e qualidade de 70%
      const compressed = await compressImage(file, 1200, 1200, 0.7);
      setPhotoUploaded(true);
      setPhotoData(compressed);
    } catch (err) {
      console.error("Erro ao comprimir imagem, usando leitor padrão:", err);
      // Fallback de segurança para imagem não comprimida se o canvas falhar
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        const rawBase64 = result.split(',')[1];
        setPhotoUploaded(true);
        setPhotoData({
          base64: result,
          rawBase64: rawBase64,
          fileName: file.name,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmitStep2 = (data) => {
    if (serviceType === 'tapete') {
      if (!data.comprimento || !data.largura) {
        alert("Por favor, preencha o comprimento e a largura do tapete.");
        return;
      }
    }
    if (serviceType === 'sofa') {
      if (!data.lugaresSofa) {
        alert("Por favor, informe a quantidade de lugares do sofá.");
        return;
      }
    }
    if (serviceType === 'colchao') {
      if (!data.tipoColchao) {
        alert("Por favor, selecione o tipo de colchão.");
        return;
      }
    }
    setStep2Data(data);
    gsap.to(contentRef.current, { opacity: 0, x: -20, duration: 0.2, onComplete: () => setStep(3) });
  };

  const onSubmitStep3 = async (data) => {
    setIsSubmitting(true);
    
    let servicoNome = '';
    let comprimento = '';
    let largura = '';
    let lugaresSofa = '';
    let tipoColchao = '';

    if (serviceType === 'sofa') {
      servicoNome = 'Sofá';
      lugaresSofa = step2Data.lugaresSofa;
    } else if (serviceType === 'tapete') {
      servicoNome = 'Tapete';
      comprimento = step2Data.comprimento;
      largura = step2Data.largura;
    } else if (serviceType === 'colchao') {
      servicoNome = 'Colchão';
      tipoColchao = step2Data.tipoColchao;
    } else if (serviceType === 'cortina') {
      servicoNome = 'Cortina';
    }

    const finalData = {
      'Serviço': servicoNome,
      'Comprimento': comprimento,
      'Largura': largura,
      // Chaves alternativas para robustez e compatibilidade total com qualquer versão do Apps Script
      'Lugares do sofa': lugaresSofa,
      'Lugares do Sófá': lugaresSofa,
      'lugaresSofa': lugaresSofa,
      'Tipo de colchão': tipoColchao,
      'Tipo de Colchão': tipoColchao,
      'tipoColchao': tipoColchao,
      'Nome': data.nome,
      'Sobrenome': data.sobrenome,
      'Email': data.email,
      'WhatsApp': data.whatsapp,
      'fileData': photoUploaded ? photoData : null
    };
    console.log("Enviando finalData:", finalData);

    try {
      let photoUrl = null;
      
      // 1. Upload da foto se existir
      if (photoUploaded && photoData && photoData.rawBase64) {
        try {
          const byteCharacters = atob(photoData.rawBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: photoData.mimeType || 'image/jpeg' });
          
          const fileName = `${Date.now()}_${photoData.fileName || 'foto.jpg'}`.replace(/\s+/g, '_');
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('fotos')
            .upload(fileName, blob, {
              contentType: photoData.mimeType || 'image/jpeg',
              cacheControl: '3600',
              upsert: false
            });
            
          if (uploadError) {
            console.error("Erro no upload da foto:", uploadError);
          } else if (uploadData) {
            const { data: publicUrlData } = supabase.storage.from('fotos').getPublicUrl(fileName);
            photoUrl = publicUrlData.publicUrl;
          }
        } catch (uploadErr) {
          console.error("Exceção ao subir foto:", uploadErr);
        }
      }

      // 2. Inserção na tabela do Supabase
      const { error: insertError } = await supabase
        .from('orcamentos')
        .insert([
          {
            servico: servicoNome,
            comprimento: comprimento || null,
            largura: largura || null,
            lugares_sofa: lugaresSofa || null,
            tipo_colchao: tipoColchao || null,
            nome: data.nome,
            sobrenome: data.sobrenome,
            email: data.email,
            whatsapp: data.whatsapp,
            foto_url: photoUrl,
            status_envio: 'Pendente'
          }
        ]);

      if (insertError) {
        throw insertError;
      }

      setIsSubmitting(false);
      gsap.to(contentRef.current, { opacity: 0, scale: 0.95, duration: 0.3, onComplete: () => setIsSuccess(true) });
      gsap.fromTo(contentRef.current, { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, delay: 0.3 });
    } catch (error) {
      console.error("Erro ao enviar dados para o Supabase:", error);
      setIsSubmitting(false);
      alert("Houve um erro de conexão ao enviar o pedido. Tente novamente.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div ref={overlayRef} className="absolute inset-0 bg-dark/80 backdrop-blur-sm" onClick={handleClose}></div>
      
      <div 
        ref={modalRef} 
        className="relative bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
        style={{ minHeight: '500px' }}
      >
        <button onClick={handleClose} className="absolute top-6 right-6 text-dark/50 hover:text-dark z-10">
          <X className="w-6 h-6" />
        </button>

        {!isSuccess && (
          <div className="bg-background border-b border-dark/5 px-8 py-6">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-px ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>
              <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-px ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`}></div>
              <div className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`}></div>
            </div>
            <div className="mt-2 text-xs font-mono text-dark/50 tracking-wider">
              {step === 1 && 'PASSO 1: SELEÇÃO'}
              {step === 2 && 'PASSO 2: DIMENSÕES'}
              {step === 3 && 'PASSO 3: CONTATO'}
            </div>
          </div>
        )}

        <div className="p-8 flex-grow flex flex-col justify-center" ref={contentRef}>
          
          {/* SUCCESS STATE */}
          {isSuccess && (
            <div className="text-center">
              <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-secondary" />
              </div>
              <h3 className="font-heading font-bold text-3xl text-dark mb-4">Orçamento Solicitado!</h3>
              <p className="text-dark/70 font-sans mb-8">A nossa equipa recebeu os seus dados e entrará em contacto via WhatsApp em alguns minutos com a sua proposta personalizada.</p>
              <button onClick={handleClose} className="magnetic-btn w-full bg-dark text-white py-4 rounded-xl font-bold">
                Voltar ao site
              </button>
            </div>
          )}

          {/* STEP 1: Type Selection */}
          {step === 1 && !isSuccess && (
            <div className="w-full">
              <h2 className="font-heading font-bold text-2xl sm:text-3xl text-dark mb-2">O que vamos revitalizar hoje?</h2>
              <p className="text-dark/60 font-sans mb-6 text-sm">Selecione o serviço pretendido para receber um orçamento rápido.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleSelectService('sofa')}
                  className="magnetic-btn border-2 border-gray-100 hover:border-primary rounded-2xl p-4 sm:p-5 text-left transition-colors group"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-xl mb-3 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                    <Sofa className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-dark mb-1">Sofá</h3>
                  <p className="text-xs text-dark/50 font-sans">Sofás e assentos.</p>
                </button>
                <button 
                  onClick={() => handleSelectService('tapete')}
                  className="magnetic-btn border-2 border-gray-100 hover:border-primary rounded-2xl p-4 sm:p-5 text-left transition-colors group"
                >
                  <div className="w-10 h-10 bg-accent/10 rounded-xl mb-3 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
                    <Grid className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-dark mb-1">Tapete</h3>
                  <p className="text-xs text-dark/50 font-sans">Tapetes e carpetes.</p>
                </button>
                <button 
                  onClick={() => handleSelectService('colchao')}
                  className="magnetic-btn border-2 border-gray-100 hover:border-primary rounded-2xl p-4 sm:p-5 text-left transition-colors group"
                >
                  <div className="w-10 h-10 bg-secondary/10 rounded-xl mb-3 flex items-center justify-center text-secondary group-hover:bg-secondary/20 transition-colors">
                    <Bed className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-dark mb-1">Colchão</h3>
                  <p className="text-xs text-dark/50 font-sans">Camas e colchões.</p>
                </button>
                <button 
                  onClick={() => handleSelectService('cortina')}
                  className="magnetic-btn border-2 border-gray-100 hover:border-primary rounded-2xl p-4 sm:p-5 text-left transition-colors group"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-xl mb-3 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-dark mb-1">Cortina</h3>
                  <p className="text-xs text-dark/50 font-sans">Cortinas com sanefa.</p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Details & Photo */}
          {step === 2 && !isSuccess && (
            <form onSubmit={handleSubmitStep2(onSubmitStep2)} className="w-full">
              <h2 className="font-heading font-bold text-2xl sm:text-3xl text-dark mb-2">Detalhes do Item</h2>
              <p className="text-dark/60 font-sans mb-6 text-sm">
                {serviceType === 'tapete' && "Insira as dimensões do tapete. O envio da foto ajuda na precisão do orçamento."}
                {serviceType === 'sofa' && "Informe os lugares do sofá. Se desejar, anexe uma foto para avaliarmos melhor."}
                {serviceType === 'colchao' && "Selecione o tamanho/modelo do seu colchão."}
                {serviceType === 'cortina' && "Para cortinas, se desejar, anexe uma foto da cortina montada na sanefa."}
              </p>

              {/* FOTO UPLOAD CONDICIONAL (Opcional) */}
              {serviceType !== 'colchao' && (
                <div className="mb-6">
                  <label className="block text-sm font-bold text-dark mb-2">
                    {serviceType === 'tapete' && "Foto do Tapete (Opcional)"}
                    {serviceType === 'sofa' && "Foto do Sofá (Opcional)"}
                    {serviceType === 'cortina' && "Foto da Cortina montada na sanefa (Opcional)"}
                  </label>
                  <label 
                    htmlFor="photo-upload"
                    className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${photoUploaded ? 'border-secondary bg-secondary/5' : 'border-gray-200 hover:border-primary'}`}
                  >
                    <input 
                      type="file" 
                      id="photo-upload" 
                      className="hidden" 
                      accept="image/png, image/jpeg, image/jpg, image/webp" 
                      onChange={handleFileSelect} 
                    />
                    {photoUploaded ? (
                      <div className="flex flex-col items-center text-secondary">
                        <CheckCircle2 className="w-7 h-7 mb-1" />
                        <span className="font-bold text-xs">Fotografia anexada com sucesso</span>
                        <span className="text-[10px] mt-0.5 text-dark/60">{photoData?.fileName}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-dark/50">
                        <UploadCloud className="w-7 h-7 mb-1" />
                        <span className="font-bold text-xs">Clique para anexar imagem</span>
                        <span className="text-[10px] mt-0.5">PNG, JPG até 5MB</span>
                      </div>
                    )}
                  </label>
                </div>
              )}

              {/* CAMPOS ESPECÍFICOS */}
              <div className="mb-6">
                {serviceType === 'tapete' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-dark mb-2">Comprimento (m)</label>
                      <input {...registerStep2('comprimento')} type="number" step="0.01" className="w-full bg-background border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Ex: 2.5" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-dark mb-2">Largura (m)</label>
                      <input {...registerStep2('largura')} type="number" step="0.01" className="w-full bg-background border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Ex: 1.8" />
                    </div>
                  </div>
                )}

                {serviceType === 'sofa' && (
                  <div>
                    <label className="block text-sm font-bold text-dark mb-2">De quantos lugares é o sofá?</label>
                    <select {...registerStep2('lugaresSofa')} className="w-full bg-background border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                      <option value="">Selecione...</option>
                      <option value="2 lugares">2 lugares</option>
                      <option value="3 lugares">3 lugares</option>
                      <option value="4 lugares">4 lugares</option>
                      <option value="5 lugares">5 lugares</option>
                      <option value="6 ou mais lugares">6 ou mais lugares</option>
                    </select>
                  </div>
                )}

                {serviceType === 'colchao' && (
                  <div>
                    <label className="block text-sm font-bold text-dark mb-2">Qual é o tipo/tamanho de colchão?</label>
                    <select {...registerStep2('tipoColchao')} className="w-full bg-background border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                      <option value="">Selecione...</option>
                      <option value="King">King</option>
                      <option value="Casal">Casal</option>
                      <option value="Solteiro">Solteiro</option>
                      <option value="Infantil">Infantil</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mt-8">
                <button type="button" onClick={() => { gsap.to(contentRef.current, { opacity: 0, x: 20, duration: 0.2, onComplete: () => setStep(1) }); }} className="text-dark/60 hover:text-dark font-bold text-sm">Voltar</button>
                <button type="submit" className="magnetic-btn bg-dark text-white px-8 py-3 rounded-xl font-bold flex items-center">
                  Seguinte <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Contact */}
          {step === 3 && !isSuccess && (
            <form onSubmit={handleSubmitStep3(onSubmitStep3)} className="w-full">
              <h2 className="font-heading font-bold text-3xl text-dark mb-2">Para onde enviamos?</h2>
              <p className="text-dark/60 font-sans mb-8">Deixe os seus contactos para receber o orçamento em minutos.</p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-dark mb-2">Nome</label>
                  <input {...registerStep3('nome')} className={`w-full bg-background border ${errors3.nome ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary`} />
                  {errors3.nome && <span className="text-red-500 text-xs mt-1 block">{errors3.nome.message}</span>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-dark mb-2">Apelido</label>
                  <input {...registerStep3('sobrenome')} className={`w-full bg-background border ${errors3.sobrenome ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary`} />
                  {errors3.sobrenome && <span className="text-red-500 text-xs mt-1 block">{errors3.sobrenome.message}</span>}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-dark mb-2">E-mail</label>
                <input {...registerStep3('email')} type="email" className={`w-full bg-background border ${errors3.email ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary`} placeholder="seu@email.com" />
                {errors3.email && <span className="text-red-500 text-xs mt-1 block">{errors3.email.message}</span>}
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-dark mb-2">WhatsApp</label>
                <input {...registerStep3('whatsapp')} type="tel" className={`w-full bg-background border ${errors3.whatsapp ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary`} placeholder="EX: 923 000000" />
                {errors3.whatsapp && <span className="text-red-500 text-xs mt-1 block">{errors3.whatsapp.message}</span>}
              </div>

              <div className="flex justify-between items-center">
                <button type="button" onClick={() => { gsap.to(contentRef.current, { opacity: 0, x: 20, duration: 0.2, onComplete: () => setStep(2) }); }} className="text-dark/60 hover:text-dark font-bold text-sm">Voltar</button>
                <button type="submit" disabled={isSubmitting} className="magnetic-btn bg-accent text-white px-8 py-3 rounded-xl font-bold flex items-center disabled:opacity-70">
                  {isSubmitting ? 'A enviar...' : 'Receber Orçamento'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default QuoteModal;
