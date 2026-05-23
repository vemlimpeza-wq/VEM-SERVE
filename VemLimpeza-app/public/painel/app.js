// Lógica do Dashboard - Clean&Co.
// Sistema autônomo de sincronização com Google Sheets via Vercel
// Funciona 24/7 independente do computador local

let quotesData = [];
let currentFilter = 'all'; // all, pending, sent, error
let selectedRowIndexes = []; // Índices das linhas selecionadas para lote
let apiURL = localStorage.getItem('google_apps_script_url') || 'https://script.google.com/macros/s/AKfycbzpZQYuE-rg0BOajGrYA3Cg0yZAZgaDeJvmBY2N6r_PsSbfD95RqZpnxmThAo1Kw46I/exec';

// ============================================================
// SISTEMA DE AUTO-SYNC (Robô Autônomo)
// ============================================================
const AUTO_SYNC_INTERVAL = 30; // segundos entre cada sincronização
let autoSyncTimer = null;
let countdownTimer = null;
let countdownValue = AUTO_SYNC_INTERVAL;
let lastSyncTime = null;
let syncRetryCount = 0;
let isFetching = false; // Lock para evitar chamadas concorrentes
const MAX_RETRIES = 3;

function startAutoSync() {
  stopAutoSync(); // Limpa timers anteriores
  countdownValue = AUTO_SYNC_INTERVAL;
  updateAutoSyncUI(true);
  
  // Timer de countdown visual (atualiza a cada segundo)
  countdownTimer = setInterval(() => {
    countdownValue--;
    updateCountdownDisplay();
    if (countdownValue <= 0) {
      countdownValue = AUTO_SYNC_INTERVAL;
    }
  }, 1000);
  
  // Timer principal de sincronização
  autoSyncTimer = setInterval(() => {
    if (!isFetching) {
      syncRetryCount = 0; // Reseta retries a cada ciclo do auto-sync
      fetchData(true); // true = silent (sem toast de sucesso a cada sync)
    } else {
      console.log('Auto-sync: fetch anterior ainda em andamento, pulando...');
    }
  }, AUTO_SYNC_INTERVAL * 1000);
}

function stopAutoSync() {
  if (autoSyncTimer) clearInterval(autoSyncTimer);
  if (countdownTimer) clearInterval(countdownTimer);
  autoSyncTimer = null;
  countdownTimer = null;
  updateAutoSyncUI(false);
}

function updateAutoSyncUI(isRunning) {
  const statusEl = document.getElementById('autoSyncStatus');
  const btnEl = document.getElementById('autoSyncToggle');
  if (!statusEl || !btnEl) return;
  
  if (isRunning) {
    statusEl.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      <span>Robô Ativo</span>
      <span class="text-slate-500">•</span>
      <span id="countdownDisplay" class="text-slate-400 font-mono">${AUTO_SYNC_INTERVAL}s</span>
    `;
    statusEl.className = 'flex items-center space-x-2 px-3 py-1.5 rounded-full text-[10px] font-semibold glass border-emerald-500/20 text-emerald-400';
    btnEl.innerHTML = '<i class="fa-solid fa-pause"></i>';
    btnEl.title = 'Pausar auto-sync';
  } else {
    statusEl.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-slate-500"></span>
      <span>Robô Pausado</span>
    `;
    statusEl.className = 'flex items-center space-x-2 px-3 py-1.5 rounded-full text-[10px] font-semibold glass border-slate-500/20 text-slate-400';
    btnEl.innerHTML = '<i class="fa-solid fa-play"></i>';
    btnEl.title = 'Iniciar auto-sync';
  }
}

function updateCountdownDisplay() {
  const el = document.getElementById('countdownDisplay');
  if (el) el.textContent = countdownValue + 's';
}

function updateLastSyncDisplay() {
  lastSyncTime = new Date();
  const el = document.getElementById('lastSyncTime');
  if (el) {
    const timeStr = lastSyncTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.textContent = 'Última sync: ' + timeStr;
  }
}

function toggleAutoSync() {
  if (autoSyncTimer) {
    stopAutoSync();
    showToast('warning', 'Auto-sync pausado.');
  } else {
    startAutoSync();
    showToast('success', 'Auto-sync ativado! Sincronizando a cada ' + AUTO_SYNC_INTERVAL + 's.');
  }
}

// Inicialização — Auto-start ao entrar no painel
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  const inputUrl = document.getElementById('apiUrlInput');
  if (inputUrl) inputUrl.value = apiURL;
  
  if (!apiURL) {
    document.getElementById('configRequiredState').classList.remove('hidden');
    document.getElementById('cardsGrid').classList.add('hidden');
    document.getElementById('emptyState').classList.add('hidden');
    updateConnectionBadge('disconnected');
  } else {
    document.getElementById('configRequiredState').classList.add('hidden');
    // Auto-start: busca dados e inicia o robô automaticamente
    fetchData(false);
    startAutoSync();
  }
}

// Conectar e buscar dados usando JSONP para evitar bloqueio de CORS
// silent = true: não mostra toast de sucesso (usado no auto-sync)
function fetchData(silent) {
  if (!apiURL) return;
  
  // Evita chamadas concorrentes
  if (isFetching) {
    console.log('fetchData: chamada ignorada — fetch já em andamento.');
    return;
  }
  isFetching = true;
  
  // Sync manual reseta retries
  if (!silent) {
    syncRetryCount = 0;
    showLoader(true);
  }
  updateConnectionBadge('connecting');
  
  // Limpa as seleções anteriores
  selectedRowIndexes = [];
  updateBatchActionPanel();
  
  // Gera um nome único para o callback JSONP
  const callbackName = '_jsonpCallback_' + Date.now();
  
  // Timeout de segurança (20 segundos — Google Apps Script pode demorar em cold starts)
  const timeoutId = setTimeout(function() {
    if (window[callbackName]) {
      cleanupJsonp();
      console.warn("JSONP timeout (20s), tentando fallback...");
      tryFallbackProxy(silent);
    }
  }, 20000);
  
  function cleanupJsonp() {
    delete window[callbackName];
    const scriptEl = document.getElementById(callbackName);
    if (scriptEl) scriptEl.remove();
    clearTimeout(timeoutId);
  }
  
  // Define o callback global que o Google Apps Script vai chamar
  window[callbackName] = function(result) {
    cleanupJsonp();
    
    try {
      if (result && result.success) {
        processSuccess(result, silent);
      } else {
        throw new Error((result && result.error) || 'Erro desconhecido da API');
      }
    } catch (error) {
      console.error(error);
      updateConnectionBadge('error');
      handleSyncError('Falha ao sincronizar: ' + error.message, silent);
    } finally {
      isFetching = false;
      if (!silent) showLoader(false);
    }
  };
  
  // Cria um <script> tag para fazer a requisição via JSONP (contorna CORS)
  const script = document.createElement('script');
  script.id = callbackName;
  script.src = `${apiURL}?action=getQuotes&callback=${callbackName}`;
  script.onerror = function() {
    cleanupJsonp();
    console.warn("JSONP onerror, tentando fallback proxy...");
    tryFallbackProxy(silent);
  };
  
  document.body.appendChild(script);
}

// Função auxiliar para chamadas JSONP genéricas (permite ler a resposta contornando CORS)
function fetchJsonp(action, params = {}, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const callbackName = '_jsonpCallback_' + Date.now() + Math.floor(Math.random() * 1000);
    
    const timeoutId = setTimeout(() => {
      cleanupJsonp();
      reject(new Error('Timeout de conexão. O servidor demorou muito para responder.'));
    }, timeoutMs);
    
    function cleanupJsonp() {
      delete window[callbackName];
      const scriptEl = document.getElementById(callbackName);
      if (scriptEl) scriptEl.remove();
      clearTimeout(timeoutId);
    }
    
    window[callbackName] = function(result) {
      cleanupJsonp();
      resolve(result);
    };
    
    const queryParams = new URLSearchParams({ action, callback: callbackName, ...params }).toString();
    
    const script = document.createElement('script');
    script.id = callbackName;
    script.src = `${apiURL}?${queryParams}`;
    script.onerror = function() {
      cleanupJsonp();
      reject(new Error('Falha na rede ao tentar comunicar com a API.'));
    };
    
    document.body.appendChild(script);
  });
}

// Fallback via CORS Proxy caso o Apps Script não suporte JSONP (versão desatualizada)
async function tryFallbackProxy(silent) {
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(`${apiURL}?action=getQuotes`)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`${apiURL}?action=getQuotes`)}`,
  ];

  for (let i = 0; i < proxies.length; i++) {
    try {
      console.log(`Tentando proxy ${i + 1}/${proxies.length}...`);
      const response = await fetch(proxies[i]);
      if (!response.ok) throw new Error(`Proxy ${i + 1} respondeu com status ${response.status}`);
      
      const text = await response.text();
      
      // Verifica se a resposta é um erro HTML do Google (não JSON)
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error('A API do Google Apps Script retornou uma página de erro HTML. O script precisa ser reimplantado.');
      }
      
      const result = JSON.parse(text);
      if (result && result.success) {
        processSuccess(result, silent);
        if (!silent) showLoader(false);
        isFetching = false;
        return; // Sucesso — sai do loop
      } else {
        throw new Error((result && result.error) || 'Erro na resposta do Proxy');
      }
    } catch (error) {
      console.warn(`Proxy ${i + 1} falhou:`, error.message);
      if (i === proxies.length - 1) {
        // Último proxy falhou — reportar erro final
        console.error("Todos os proxies falharam:", error);
        updateConnectionBadge('error');
        handleSyncError('Falha ao conectar com a planilha. Verifique se o Google Apps Script foi reimplantado corretamente.', silent);
        if (!silent) showLoader(false);
        isFetching = false;
      }
    }
  }
}

// Processa o sucesso dos dados (usado por JSONP e Proxy)
function processSuccess(result, silent) {
  // Inverte a ordem para exibir os mais recentes no topo
  quotesData = result.quotes.reverse();
  updateStats();
  renderQuotes();
  updateConnectionBadge('connected');
  updateLastSyncDisplay();
  syncRetryCount = 0; // Reseta contador de retries
  if (!silent) {
    showToast('success', 'Planilha sincronizada com sucesso!');
  }
}

// Tratamento de erro com retry automático
function handleSyncError(message, silent) {
  syncRetryCount++;
  
  if (syncRetryCount <= MAX_RETRIES) {
    // Retry automático com backoff exponencial
    const retryDelay = Math.min(syncRetryCount * 5, 15); // 5s, 10s, 15s
    if (!silent) {
      showToast('warning', `${message} Tentando novamente em ${retryDelay}s... (${syncRetryCount}/${MAX_RETRIES})`);
    }
    // Libera o lock antes do retry para permitir nova chamada
    isFetching = false;
    setTimeout(() => fetchData(silent), retryDelay * 1000);
  } else {
    isFetching = false;
    // Só mostra toast de retries esgotados no modo manual ou na primeira vez
    if (!silent) {
      showToast('error', message + ' Retries esgotados.');
    }
    // Muda para "connected" se já temos dados carregados (erro apenas no refresh)
    if (quotesData.length > 0) {
      updateConnectionBadge('connected');
    } else {
      document.getElementById('emptyState').classList.remove('hidden');
    }
  }
}


// Atualizar estatísticas no topo
function updateStats() {
  const total = quotesData.length;
  
  const pending = quotesData.filter(q => {
    const statusLower = (q.status || '').toLowerCase().trim();
    return statusLower !== 'enviado' && statusLower !== 'erro';
  }).length;
  
  const sent = quotesData.filter(q => (q.status || '').toLowerCase().trim() === 'enviado').length;
  const error = quotesData.filter(q => (q.status || '').toLowerCase().trim() === 'erro').length;
  
  document.getElementById('statTotal').innerText = total;
  document.getElementById('statPending').innerText = pending;
  document.getElementById('statSent').innerText = sent;
  document.getElementById('statError').innerText = error;
}

// Normalização de chaves no frontend (idêntico ao backend)
function normalizeHeaderKey(header) {
  if (!header) return '';
  var norm = header.toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '');
  
  if (norm.indexOf('data') !== -1 || norm.indexOf('date') !== -1) return 'date';
  if (norm.indexOf('servico') !== -1 || norm.indexOf('service') !== -1) return 'servico';
  if (norm.indexOf('comprimento') !== -1 || norm.indexOf('length') !== -1) return 'comprimento';
  if (norm.indexOf('largura') !== -1 || norm.indexOf('width') !== -1) return 'largura';
  if (norm.indexOf('lugares') !== -1 || norm.indexOf('assento') !== -1 || norm.indexOf('seats') !== -1) return 'lugaressofa';
  if (norm.indexOf('colchao') !== -1 || norm.indexOf('mattress') !== -1) return 'tipocolchao';
  if (norm.indexOf('sobrenome') !== -1 || norm.indexOf('apelido') !== -1 || norm.indexOf('lastname') !== -1) return 'sobrenome';
  if (norm.indexOf('nome') !== -1 || norm.indexOf('name') !== -1) return 'nome';
  if (norm.indexOf('email') !== -1 || norm.indexOf('mail') !== -1) return 'email';
  if (norm.indexOf('whatsapp') !== -1 || norm.indexOf('whats') !== -1 || norm.indexOf('celular') !== -1 || norm.indexOf('telefone') !== -1 || norm.indexOf('phone') !== -1) return 'whatsapp';
  if (norm.indexOf('foto') !== -1 || norm.indexOf('imagem') !== -1 || norm.indexOf('image') !== -1 || norm.indexOf('upload') !== -1) return 'fotourl';
  if (norm.indexOf('valor') !== -1 || norm.indexOf('preco') !== -1 || norm.indexOf('price') !== -1 || norm.indexOf('cost') !== -1) return 'valor';
  if (norm.indexOf('status') !== -1) return 'status';
  
  return norm;
}

// Renderizar cards
function renderQuotes() {
  const grid = document.getElementById('cardsGrid');
  const emptyState = document.getElementById('emptyState');
  
  grid.innerHTML = '';
  
  let filtered = quotesData;
  if (currentFilter === 'pending') {
    filtered = quotesData.filter(q => {
      const s = (q.status || '').toLowerCase().trim();
      return s !== 'enviado' && s !== 'erro';
    });
  } else if (currentFilter === 'sent') {
    filtered = quotesData.filter(q => (q.status || '').toLowerCase().trim() === 'enviado');
  } else if (currentFilter === 'error') {
    filtered = quotesData.filter(q => (q.status || '').toLowerCase().trim() === 'erro');
  }
  
  if (filtered.length === 0) {
    grid.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  grid.classList.remove('hidden');
  
  filtered.forEach(quote => {
    const card = document.createElement('div');
    const isSelected = selectedRowIndexes.includes(quote.rowIndex);
    card.className = `glass p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between neon-border-glow transition-all duration-300 ${isSelected ? 'border-neonpurple ring-1 ring-neonpurple bg-neonpurple/5 shadow-[0_0_15px_rgba(92,50,240,0.1)]' : ''}`;
    
    let statusClass = 'from-amber-500/10 to-orange-500/10 text-amber-400 border-amber-500/20';
    let statusLabel = 'Pendente';
    const statusLower = (quote.status || '').toLowerCase().trim();
    
    if (statusLower === 'enviado') {
      statusClass = 'from-emerald-500/10 to-teal-500/10 text-emerald-400 border-emerald-500/20';
      statusLabel = 'Enviado';
    } else if (statusLower === 'erro') {
      statusClass = 'from-rose-500/10 to-red-500/10 text-rose-400 border-rose-500/20';
      statusLabel = 'Erro';
    }
    
    let imgSection = '';
    const hasValidPhoto = quote.fotoUrl && 
                           quote.fotoUrl.startsWith('http') && 
                           !quote.fotoUrl.includes('Erro no upload') && 
                           !quote.fotoUrl.includes('Sem foto');
                           
    if (hasValidPhoto) {
      const cleanImgUrl = getGoogleDriveImageUrl(quote.fotoUrl);
      imgSection = `
        <div class="relative w-full h-40 rounded-2xl overflow-hidden mb-4 group cursor-pointer border border-white/5 bg-slate-900/40" onclick="openImageModalByIndex(${quote.rowIndex})">
          <img src="${cleanImgUrl}" alt="Foto do orçamento" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-200">
            <i class="fa-solid fa-magnifying-glass-plus text-white text-xl"></i>
          </div>
        </div>
      `;
    } else {
      imgSection = `
        <div class="w-full h-12 flex items-center justify-center rounded-2xl border border-white/5 bg-white/2 mb-4 text-xs text-slate-500">
          <i class="fa-regular fa-image mr-2"></i> Sem foto anexada
        </div>
      `;
    }
    
    let detailLines = [];
    if (quote.lugaresSofa) detailLines.push(`<span class="px-2.5 py-1 rounded-lg bg-white/5 text-[11px] font-semibold text-slate-300 border border-white/5"><i class="fa-solid fa-couch mr-1 text-neonpurple"></i>${quote.lugaresSofa}</span>`);
    if (quote.tipoColchao) detailLines.push(`<span class="px-2.5 py-1 rounded-lg bg-white/5 text-[11px] font-semibold text-slate-300 border border-white/5"><i class="fa-solid fa-bed mr-1 text-neonpurple"></i>${quote.tipoColchao}</span>`);
    
    // Mostra as dimensões (especialmente útil para tapetes)
    if (quote.comprimento && quote.largura) {
      let calcArea = '';
      const c = parseFloat(String(quote.comprimento).replace(',', '.'));
      const l = parseFloat(String(quote.largura).replace(',', '.'));
      if (!isNaN(c) && !isNaN(l)) {
        calcArea = ` (${(c * l).toFixed(2)}m²)`;
      }
      detailLines.push(`<span class="px-2.5 py-1 rounded-lg bg-white/5 text-[11px] font-semibold text-slate-300 border border-white/5"><i class="fa-solid fa-maximize mr-1 text-neonpurple"></i>${quote.comprimento}m x ${quote.largura}m${calcArea}</span>`);
    } else if (quote.dimensao || quote.dimencao || quote.medida || quote.tamanho) {
      const dimStr = quote.dimensao || quote.dimencao || quote.medida || quote.tamanho;
      detailLines.push(`<span class="px-2.5 py-1 rounded-lg bg-white/5 text-[11px] font-semibold text-slate-300 border border-white/5"><i class="fa-solid fa-maximize mr-1 text-neonpurple"></i>${dimStr}</span>`);
    }
    
    const detailsHtml = detailLines.length > 0 
      ? `<div class="flex flex-wrap gap-2 mb-4">${detailLines.join('')}</div>`
      : '';
      
    let waNumberOnly = String(quote.whatsapp).replace(/\D/g, '');
    // Se o número tiver exatamente 9 dígitos, assume que é de Angola e adiciona o código do país (244)
    if (waNumberOnly.length === 9) {
      waNumberOnly = '244' + waNumberOnly;
    }
    
    const waLink = quote.whatsapp 
      ? `<a href="https://wa.me/${waNumberOnly}" target="_blank" class="text-emerald-400 hover:text-emerald-300 transition text-xs font-semibold flex items-center mt-1"><i class="fa-brands fa-whatsapp mr-1.5 text-sm"></i>${quote.whatsapp}</a>`
      : '<span class="text-xs text-slate-500 flex items-center mt-1"><i class="fa-solid fa-phone-slash mr-1.5"></i>Sem número</span>';

    // Listagem dinâmica de todas as colunas adicionais da planilha
    const principalKeys = [
      'date', 'servico', 'comprimento', 'largura', 'dimensao', 'dimencao', 'medida', 'tamanho', 'lugaressofa', 
      'tipocolchao', 'nome', 'sobrenome', 'email', 'whatsapp', 
      'fotourl', 'valor', 'status', 'rowindex', 'extradata'
    ];
    
    let extraFieldsHtml = '';
    if (quote.extraData) {
      const fields = Object.entries(quote.extraData).filter(([key, val]) => {
        const normKey = normalizeHeaderKey(key);
        return !principalKeys.includes(normKey) && val !== undefined && val !== null && val.toString().trim() !== '';
      });
      
      if (fields.length > 0) {
        extraFieldsHtml = `
          <div class="mt-4 pt-3 border-t border-white/5">
            <span class="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-2">Informações Adicionais</span>
            <div class="grid grid-cols-2 gap-2 text-xs">
              ${fields.map(([key, val]) => `
                <div class="bg-white/2 p-2 rounded-xl border border-white/5">
                  <span class="text-[9px] text-slate-400 block font-semibold leading-tight">${key}</span>
                  <span class="font-medium text-white break-all leading-normal">${val}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    let footerAction = '';
    const isPendingCard = statusLower !== 'enviado' && statusLower !== 'erro';
    
    // Checkbox para seleção em lote
    let checkboxHtml = '';
    if (isPendingCard) {
      checkboxHtml = `
        <div class="mr-3 mt-1.5 flex items-center justify-center">
          <input type="checkbox" 
                 id="chk-${quote.rowIndex}" 
                 onclick="event.stopPropagation(); toggleSelectQuote(${quote.rowIndex})" 
                 ${isSelected ? 'checked' : ''} 
                 class="w-4 h-4 rounded border-white/10 bg-white/5 text-neonpurple focus:ring-neonpurple focus:ring-opacity-25 transition cursor-pointer">
        </div>
      `;
    }

    // Calcula a idade do orçamento para liberar o botão de excluir (> 24h)
    let ageMs = 0;
    if (quote.date) {
      let parts = String(quote.date).match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
      let qDate = null;
      if (parts) {
        qDate = new Date(parts[3], parts[2] - 1, parts[1], parts[4] || 0, parts[5] || 0);
      } else {
        qDate = new Date(quote.date);
      }
      if (!isNaN(qDate.getTime())) {
        ageMs = new Date().getTime() - qDate.getTime();
      }
    }
    const isOlderThan24h = ageMs >= 24 * 60 * 60 * 1000;

    if (isPendingCard) {
      footerAction = `
        <div class="mt-5 pt-4 border-t border-white/5">
          <label class="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Inserir Valor e Enviar</label>
          <div class="flex space-x-2">
            <div class="relative flex-1">
              <span class="absolute left-3.5 top-2.5 text-xs font-semibold text-slate-400">Kz</span>
              <input type="text" id="val-input-${quote.rowIndex}" placeholder="0,00" value="${quote.valor || ''}" class="w-full pl-9 pr-3 py-2 text-xs rounded-xl glass-input text-white">
            </div>
            <button onclick="sendQuote(${quote.rowIndex})" id="btn-send-${quote.rowIndex}" class="px-4 py-2 bg-neonpurple hover:bg-neonpurple/90 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 transition shadow-lg shadow-neonpurple/20">
              <i class="fa-solid fa-paper-plane"></i>
              <span>Enviar</span>
            </button>
          </div>
        </div>
      `;
    } else {
      let deleteBtnHtml = '';
      if (isOlderThan24h) {
        deleteBtnHtml = `<button onclick="deleteQuoteAction(${quote.rowIndex})" class="px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 transition text-[10px] font-bold flex items-center ml-2" title="Eliminar orçamento (possível após 24h)">
          <i class="fa-solid fa-trash-can"></i>
        </button>`;
      } else {
        deleteBtnHtml = `<button onclick="showToast('warning', 'Apenas orçamentos com mais de 24 horas de existência podem ser eliminados.')" class="px-3 py-1.5 rounded-lg border border-white/5 bg-white/2 text-slate-500 cursor-not-allowed transition text-[10px] font-bold flex items-center ml-2" title="Disponível após 24 horas">
          <i class="fa-solid fa-trash-can"></i>
        </button>`;
      }

      footerAction = `
        <div class="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
          <div>
            <span class="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Valor Enviado</span>
            <span class="text-lg font-bold font-title text-white">Kz ${quote.valor || '0,00'}</span>
          </div>
          <div class="flex items-center">
            <button onclick="resendPrompt(${quote.rowIndex}, '${quote.valor}')" class="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition text-[10px] font-bold">
              <i class="fa-solid fa-rotate-right mr-1"></i> Reenviar
            </button>
            ${deleteBtnHtml}
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-start">
            ${checkboxHtml}
            <div>
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">${quote.date || 'Sem data'}</span>
              <h4 class="text-base font-title font-bold text-white mt-1">${quote.nome} ${quote.sobrenome}</h4>
              <span class="text-xs text-slate-400 block max-w-full overflow-hidden text-ellipsis">${quote.email}</span>
              ${waLink}
            </div>
          </div>
          <div class="px-2.5 py-1 rounded-full border text-[10px] font-bold bg-gradient-to-r ${statusClass}">
            ${statusLabel}
          </div>
        </div>
        
        <div class="mb-3">
          <span class="px-2.5 py-1.5 rounded-xl bg-neonpurple/15 text-neonviolet text-xs font-bold border border-neonpurple/20">
            <i class="fa-solid fa-broom mr-1"></i> ${quote.servico || 'Serviço Geral'}
          </span>
        </div>
        
        ${detailsHtml}
        ${imgSection}
        ${extraFieldsHtml}
      </div>
      
      ${footerAction}
    `;
    
    grid.appendChild(card);
  });
}


// Enviar orçamento
async function sendQuote(rowIndex) {
  const input = document.getElementById(`val-input-${rowIndex}`);
  const btn = document.getElementById(`btn-send-${rowIndex}`);
  
  if (!input || !btn) return;
  const valor = input.value.trim();
  
  if (!valor) {
    showToast('warning', 'Por favor, insira um valor válido.');
    input.focus();
    return;
  }
  
  btn.disabled = true;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i>`;
  
  try {
    const result = await fetchJsonp('sendQuote', { rowIndex: rowIndex, valor: valor });
    
    if (result && result.success) {
      showToast('success', 'Orçamento disparado com sucesso!');
      setTimeout(() => fetchData(true), 2000);
    } else {
      throw new Error((result && result.error) || 'Erro desconhecido ao enviar. Atualize o Apps Script.');
    }
  } catch (error) {
    console.error(error);
    showToast('error', 'Falha no envio: ' + error.message);
    fetchData(true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

// Reenviar orçamento
function resendPrompt(rowIndex, currentValue) {
  const newValue = prompt("Deseja alterar o valor antes de reenviar?", currentValue);
  if (newValue === null) return;
  
  const tempInput = document.createElement('input');
  tempInput.id = `val-input-${rowIndex}`;
  tempInput.value = newValue;
  document.body.appendChild(tempInput);
  
  const tempBtn = document.createElement('button');
  tempBtn.id = `btn-send-${rowIndex}`;
  document.body.appendChild(tempBtn);
  
  sendQuote(rowIndex).then(() => {
    tempInput.remove();
    tempBtn.remove();
  });
}

// Eliminar Orçamento Específico
async function deleteQuoteAction(rowIndex) {
  const confirmMsg = `Deseja realmente eliminar este orçamento?\n\nEsta ação é irreversível na planilha e os dados não voltarão.`;
  if (!confirm(confirmMsg)) return;

  showLoader(true);
  try {
    const result = await fetchJsonp('deleteQuote', { rowIndex: rowIndex });
    
    if (result && result.success) {
      showToast('success', 'Orçamento excluído permanentemente!');
      // Atualiza os dados imediatamente após o sucesso
      fetchData(true);
    } else {
      throw new Error((result && result.error) || 'O script não foi atualizado ou ocorreu um erro.');
    }
  } catch (error) {
    console.error(error);
    showToast('error', 'Falha ao eliminar: ' + error.message);
    fetchData(true);
  } finally {
    showLoader(false);
  }
}

// Modificar filtro
function setFilter(filter) {
  currentFilter = filter;
  ['all', 'pending', 'sent', 'error'].forEach(f => {
    const btn = document.getElementById(`filterBtn-${f}`);
    if (f === filter) {
      btn.className = "px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 bg-neonpurple text-white";
    } else {
      btn.className = "px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 text-slate-400 hover:text-white";
    }
  });
  renderQuotes();
}

function getGoogleDriveImageUrl(url) {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  return url;
}

// Modals
function openSettings() {
  document.getElementById('settingsModal').classList.remove('hidden');
  document.getElementById('settingsModal').classList.add('flex');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.add('hidden');
  document.getElementById('settingsModal').classList.remove('flex');
}

function saveSettings() {
  const url = document.getElementById('apiUrlInput').value.trim();
  if (!url) {
    showToast('warning', 'Por favor, insira uma URL válida.');
    return;
  }
  
  apiURL = url;
  localStorage.setItem('google_apps_script_url', url);
  closeSettings();
  initApp();
}

function openImageModal(url, clientName) {
  const modal = document.getElementById('imageModal');
  const img = document.getElementById('modalImg');
  const clientSpan = document.getElementById('modalImageClient');
  const link = document.getElementById('modalImageLink');
  
  img.src = url;
  clientSpan.innerText = 'Foto do Cliente: ' + clientName;
  link.href = url;
  
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function openImageModalByIndex(rowIndex) {
  const quote = quotesData.find(q => q.rowIndex === rowIndex);
  if (!quote) return;
  const cleanImgUrl = getGoogleDriveImageUrl(quote.fotoUrl);
  openImageModal(cleanImgUrl, `${quote.nome} ${quote.sobrenome}`);
}

function closeImageModal() {
  const modal = document.getElementById('imageModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// Lógica de Seleção em Lote
function toggleSelectQuote(rowIndex) {
  const index = selectedRowIndexes.indexOf(rowIndex);
  if (index === -1) {
    selectedRowIndexes.push(rowIndex);
  } else {
    selectedRowIndexes.splice(index, 1);
  }
  
  renderQuotes();
  updateBatchActionPanel();
}

function toggleSelectAllPending() {
  // Pega apenas as linhas que são elegíveis para envio (pendentes) no filtro atual
  let filteredPending = quotesData.filter(q => {
    const statusLower = (q.status || '').toLowerCase().trim();
    const isPending = statusLower !== 'enviado' && statusLower !== 'erro';
    
    if (!isPending) return false;
    
    if (currentFilter === 'pending') return true;
    if (currentFilter === 'all') return true;
    
    return false;
  });
  
  if (filteredPending.length === 0) {
    showToast('warning', 'Nenhum orçamento pendente encontrado neste filtro.');
    return;
  }
  
  const allSelected = filteredPending.every(q => selectedRowIndexes.includes(q.rowIndex));
  
  if (allSelected) {
    filteredPending.forEach(q => {
      const idx = selectedRowIndexes.indexOf(q.rowIndex);
      if (idx !== -1) selectedRowIndexes.splice(idx, 1);
    });
  } else {
    filteredPending.forEach(q => {
      if (!selectedRowIndexes.includes(q.rowIndex)) {
        selectedRowIndexes.push(q.rowIndex);
      }
    });
  }
  
  renderQuotes();
  updateBatchActionPanel();
}

function clearSelection() {
  selectedRowIndexes = [];
  renderQuotes();
  updateBatchActionPanel();
}

function updateBatchActionPanel() {
  const panel = document.getElementById('batchActionBar');
  const countSpan = document.getElementById('batchCount');
  
  if (!panel || !countSpan) return;
  
  if (selectedRowIndexes.length > 0) {
    panel.classList.remove('hidden');
    panel.classList.add('flex');
    countSpan.innerText = selectedRowIndexes.length;
  } else {
    panel.classList.add('hidden');
    panel.classList.remove('flex');
  }
}

async function sendSelectedQuotes() {
  if (selectedRowIndexes.length === 0) return;
  
  const listToSend = [];
  const missingValuesNames = [];
  
  selectedRowIndexes.forEach(rowIndex => {
    const input = document.getElementById(`val-input-${rowIndex}`);
    const quote = quotesData.find(q => q.rowIndex === rowIndex);
    if (!input || !quote) return;
    
    const valor = input.value.trim();
    if (valor) {
      listToSend.push({ rowIndex, valor, quote });
    } else {
      missingValuesNames.push(`${quote.nome} ${quote.sobrenome}`);
    }
  });
  
  if (missingValuesNames.length > 0) {
    showToast('warning', `Insira valores para os seguintes clientes antes de enviar: ${missingValuesNames.join(', ')}`);
    return;
  }
  
  if (listToSend.length === 0) {
    showToast('warning', 'Por favor, insira valores nos campos de orçamento.');
    return;
  }
  
  const confirmMsg = `Deseja enviar orçamentos para os ${listToSend.length} cliente(s) selecionado(s)?`;
  if (!confirm(confirmMsg)) return;
  
  showLoader(true);
  showToast('warning', `Enviando ${listToSend.length} orçamento(s) em lote...`);
  
  let successCount = 0;
  let failCount = 0;
  
  const promises = listToSend.map(async (item) => {
    try {
      const result = await fetchJsonp('sendQuote', { rowIndex: item.rowIndex, valor: item.valor });
      if (result && result.success) {
        successCount++;
      } else {
        throw new Error((result && result.error) || 'Erro ao enviar');
      }
    } catch (err) {
      console.error(`Erro ao enviar orçamento da linha ${item.rowIndex}:`, err);
      failCount++;
    }
  });
  
  await Promise.all(promises);
  
  showLoader(false);
  
  if (successCount > 0) {
    showToast('success', `${successCount} orçamento(s) enviado(s) com sucesso!`);
  }
  if (failCount > 0) {
    showToast('error', `Falha ao enviar ${failCount} orçamento(s). Verifique a conexão.`);
  }
  
  fetchData();
}

// ============================================================
// Limpar Orçamentos Antigos (Enviados há mais de 14 dias)
// ============================================================
async function cleanOldQuotes() {
  if (!apiURL) {
    showToast('warning', 'Configure a URL da API antes de usar esta função.');
    return;
  }

  // Conta localmente quantos orçamentos "Enviado" podem ser antigos
  const sentQuotes = quotesData.filter(q => (q.status || '').toLowerCase().trim() === 'enviado');
  if (sentQuotes.length === 0) {
    showToast('warning', 'Não há orçamentos enviados para limpar.');
    return;
  }

  const confirmMsg = `Deseja eliminar todos os orçamentos com status "Enviado" que tenham mais de 14 dias?\n\nEsta ação é irreversível.`;
  if (!confirm(confirmMsg)) return;

  const btn = document.getElementById('btnCleanOld');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i><span class="hidden sm:inline">Limpando...</span>';
  }

  showToast('warning', 'Eliminando orçamentos antigos da planilha...');

  try {
    const result = await fetchJsonp('cleanOldQuotes');
    
    if (result && result.success) {
      showToast('success', `Limpeza concluída! ${result.deleted || 0} orçamentos removidos.`);
      setTimeout(() => fetchData(true), 2000);
    } else {
      throw new Error((result && result.error) || 'Erro desconhecido ao limpar. Atualize o Apps Script.');
    }
  } catch (error) {
    console.error('Erro ao limpar orçamentos antigos:', error);
    showToast('error', 'Falha na limpeza: ' + error.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-trash-can"></i><span class="hidden sm:inline">Limpar Antigos</span>';
    }
  }
}

// Helpers Visuais
function showLoader(show) {
  const loader = document.getElementById('loader');
  if (show) {
    loader.classList.remove('hidden');
    loader.classList.add('flex');
  } else {
    loader.classList.add('hidden');
    loader.classList.remove('flex');
  }
}

function updateConnectionBadge(status) {
  const badge = document.getElementById('connectionStatus');
  if (status === 'disconnected') {
    badge.className = "flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-medium glass border-red-500/20 text-red-400";
    badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-red-500"></span><span>Desconectado</span>`;
  } else if (status === 'connecting') {
    badge.className = "flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-medium glass border-amber-500/20 text-amber-400";
    badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span><span>Conectando...</span>`;
  } else if (status === 'connected') {
    badge.className = "flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-medium glass border-emerald-500/20 text-emerald-400";
    badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span>Sincronizado</span>`;
  } else if (status === 'error') {
    badge.className = "flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-medium glass border-rose-500/20 text-rose-400";
    badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span><span>Erro de Conexão</span>`;
  }
}

// Toast Notificações
function showToast(type, message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  
  let bg = 'bg-slate-900 border-white/10';
  let icon = '<i class="fa-solid fa-circle-info text-blue-400"></i>';
  
  if (type === 'success') {
    bg = 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300';
    icon = '<i class="fa-solid fa-circle-check text-emerald-400"></i>';
  } else if (type === 'error') {
    bg = 'bg-rose-950/90 border-rose-500/30 text-rose-300';
    icon = '<i class="fa-solid fa-circle-exclamation text-rose-400"></i>';
  } else if (type === 'warning') {
    bg = 'bg-amber-950/90 border-amber-500/30 text-amber-300';
    icon = '<i class="fa-solid fa-triangle-exclamation text-amber-400"></i>';
  }
  
  toast.className = `flex items-center space-x-3 px-4 py-3 rounded-2xl border ${bg} shadow-lg text-xs font-semibold animate-[slideIn_0.2s_ease]`;
  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.className += ' opacity-0 transition-opacity duration-300';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

