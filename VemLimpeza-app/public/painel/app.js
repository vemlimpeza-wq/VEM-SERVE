// Lógica do Dashboard - Clean&Co.
// Sistema autônomo de sincronização com Google Sheets via Vercel
// Funciona 24/7 independente do computador local

let quotesData = [];
let currentFilter = 'all'; // all, pending, sent, error
let selectedRowIndexes = []; // Índices das linhas selecionadas para lote

// Configuração do Supabase (lido das Variaveis de Ambiente via URL ou .env na build, ou inserido no HTML)
// Como estamos em um frontend estático, pegaremos da URL se não estiver no localStorage
let supabaseUrl = localStorage.getItem('supabase_url') || 'https://xhlsqestbhvdlpsrdjdk.supabase.co';
let supabaseKey = localStorage.getItem('supabase_anon_key') || 'sb_publishable_O7trOvtZ25cp_4zRHFJChQ_yEAUCoTa';
let supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

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
  if (inputUrl) inputUrl.value = supabaseUrl;
  
  if (!supabaseClient) {
    document.getElementById('configRequiredState').classList.remove('hidden');
    document.getElementById('cardsGrid').classList.add('hidden');
    document.getElementById('emptyState').classList.add('hidden');
    updateConnectionBadge('disconnected');
  } else {
    document.getElementById('configRequiredState').classList.add('hidden');
    // Auto-start: busca dados e inicia o robô automaticamente
    fetchData(false);
    startAutoSync();
    initRealtime(); // Ativar escuta em tempo real do chat
  }
}

// Conectar e buscar dados do Supabase
async function fetchData(silent) {
  if (!supabaseClient) return;
  
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

  try {
    const { data, error } = await supabaseClient
      .from('orcamentos')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) {
      throw error;
    }

    // Mapeia para o formato esperado pelo frontend
    const mappedQuotes = data.map(item => {
      // Formata a data para dd/mm/yyyy hh:mm
      let dateStr = 'Sem data';
      if (item.criado_em) {
        const d = new Date(item.criado_em);
        dateStr = d.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'}) + ' ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
      }

      return {
        rowIndex: item.id,
        id: item.id,
        date: dateStr,
        servico: item.servico,
        comprimento: item.comprimento,
        largura: item.largura,
        lugaresSofa: item.lugares_sofa,
        tipoColchao: item.tipo_colchao,
        nome: item.nome,
        sobrenome: item.sobrenome,
        email: item.email,
        whatsapp: item.whatsapp,
        fotoUrl: item.foto_url,
        valor: item.valor_orcamento,
        status: item.status_envio
      };
    });

    processSuccess({ quotes: mappedQuotes }, silent);
  } catch (error) {
    console.error(error);
    updateConnectionBadge('error');
    handleSyncError('Falha ao sincronizar: ' + error.message, silent);
  } finally {
    isFetching = false;
    if (!silent) showLoader(false);
  }
}

// Processa o sucesso dos dados
async function processSuccess(result, silent) {
  // Dados já vêm ordenados pela data descendente do Supabase
  quotesData = result.quotes;
  
  try {
    // Buscar as últimas mensagens para avaliar lidas/não lidas
    const { data: msgs } = await supabaseClient
      .from('whatsapp_mensagens')
      .select('telefone_cliente, direcao, criado_em')
      .order('criado_em', { ascending: false })
      .limit(500);
      
    if (msgs) {
      // Agrupar por telefone para achar a última mensagem
      const lastMsgs = {};
      msgs.forEach(m => {
        if (!lastMsgs[m.telefone_cliente]) lastMsgs[m.telefone_cliente] = m;
      });
      
      quotesData.forEach(q => {
        let telefone = String(q.whatsapp || '').replace(/\D/g, '');
        if (telefone.length === 9) telefone = '244' + telefone;
        
        const lastMsg = lastMsgs[telefone];
        q.hasUnreadMsg = false;
        
        if (lastMsg && lastMsg.direcao === 'entrada') {
          const lastRead = localStorage.getItem('chat_read_' + telefone);
          if (!lastRead || new Date(lastMsg.criado_em) > new Date(lastRead)) {
            q.hasUnreadMsg = true;
          }
        }
      });
    }
  } catch (err) {
    console.error("Erro ao checar mensagens não lidas:", err);
  }

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
        <div class="relative w-full h-40 rounded-2xl overflow-hidden mb-4 group cursor-pointer border border-white/5 bg-slate-900/40" onclick="openImageModalByIndex('${quote.rowIndex}')">
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
    
    const unreadIndicator = quote.hasUnreadMsg 
      ? `<span class="absolute -top-1 -right-2 flex h-2.5 w-2.5" title="Nova mensagem não lida no Chat">
           <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
           <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
         </span>`
      : '';

    const waLink = quote.whatsapp 
      ? `<div class="relative inline-block mt-1"><a href="https://wa.me/${waNumberOnly}" target="_blank" class="text-emerald-400 hover:text-emerald-300 transition text-xs font-semibold flex items-center pr-2"><i class="fa-brands fa-whatsapp mr-1.5 text-sm"></i>${quote.whatsapp}</a>${unreadIndicator}</div>`
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
                 onclick="event.stopPropagation(); toggleSelectQuote('${quote.rowIndex}')" 
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
              <span class="absolute left-3.5 top-3.5 text-sm font-semibold text-slate-400">Kz</span>
              <input type="text" id="val-input-${quote.rowIndex}" placeholder="0,00" value="${quote.valor || ''}" class="w-full pl-9 pr-3 py-3 text-sm rounded-xl glass-input text-white min-h-[48px]">
            </div>
            <button onclick="sendQuote('${quote.rowIndex}')" id="btn-send-${quote.rowIndex}" class="px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm flex items-center justify-center transition min-h-[48px] min-w-[48px]" title="Enviar E-mail">
              <i class="fa-solid fa-envelope text-base"></i>
            </button>
            <button onclick="sendWhatsApp('${quote.rowIndex}')" id="btn-wa-${quote.rowIndex}" class="px-4 sm:px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-600/20 min-h-[48px]" title="Enviar WhatsApp">
              <i class="fa-brands fa-whatsapp text-lg"></i>
              <span class="hidden sm:inline">WhatsApp</span>
            </button>
            <button onclick="openChatModal('${quote.rowIndex}')" class="px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm flex items-center justify-center transition relative min-h-[48px] min-w-[48px]" title="Abrir Chat do WhatsApp">
              <i class="fa-regular fa-comments text-base"></i>
              ${quote.hasUnreadMsg ? `<span class="absolute -top-1 -right-1 flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span></span>` : ''}
            </button>
          </div>
        </div>
      `;
    } else {
      let deleteBtnHtml = '';
      if (isOlderThan24h) {
        deleteBtnHtml = `<button onclick="deleteQuoteAction('${quote.rowIndex}')" class="px-4 py-3 sm:py-2.5 rounded-xl border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 transition text-xs font-bold flex items-center justify-center min-h-[48px] min-w-[48px] ml-0 sm:ml-2" title="Eliminar orçamento (possível após 24h)">
          <i class="fa-solid fa-trash-can text-base"></i>
        </button>`;
      } else {
        deleteBtnHtml = `<button onclick="showToast('warning', 'Apenas orçamentos com mais de 24 horas de existência podem ser eliminados.')" class="px-4 py-3 sm:py-2.5 rounded-xl border border-white/5 bg-white/2 text-slate-500 cursor-not-allowed transition text-xs font-bold flex items-center justify-center min-h-[48px] min-w-[48px] ml-0 sm:ml-2" title="Disponível após 24 horas">
          <i class="fa-solid fa-trash-can text-base"></i>
        </button>`;
      }

      footerAction = `
        <div class="mt-5 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span class="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Valor Enviado</span>
            <span class="text-2xl font-bold font-title text-white">Kz ${quote.valor || '0,00'}</span>
          </div>
          <div class="flex items-center space-x-2 w-full sm:w-auto">
            <button onclick="openChatModal('${quote.rowIndex}')" class="flex-1 sm:flex-none justify-center px-4 py-3 sm:py-2.5 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400 transition text-xs sm:text-sm font-bold flex items-center relative min-h-[48px]" title="Abrir Chat do WhatsApp">
              <i class="fa-brands fa-whatsapp mr-2 text-base"></i> Chat
              ${quote.hasUnreadMsg ? `<span class="absolute -top-1 -right-1 flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span></span>` : ''}
            </button>
            <button onclick="resendPrompt('${quote.rowIndex}', '${quote.valor}')" class="flex-1 sm:flex-none justify-center px-4 py-3 sm:py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition text-xs sm:text-sm font-bold min-h-[48px] flex items-center">
              <i class="fa-solid fa-rotate-right mr-2 text-base"></i> <span class="sm:inline">Reenviar</span>
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
    // Invoca a Edge Function 'send-email' passando o ID do orçamento e o valor
    const { data, error } = await supabaseClient.functions.invoke('send-email', {
      body: { quoteId: rowIndex, valor: valor }
    });

    if (error) {
      throw error;
    }
    
    // A Edge Function encarrega-se de mudar o status para 'Enviado' na Base de Dados
    showToast('success', 'E-mail de orçamento enviado pelo Brevo!');
    setTimeout(() => fetchData(true), 2000);
  } catch (error) {
    console.error(error);
    showToast('error', 'Falha no envio: ' + (error.message || 'Erro na nuvem'));
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
  const confirmMsg = `Deseja realmente eliminar este orçamento?\n\nEsta ação é irreversível e os dados não voltarão.`;
  if (!confirm(confirmMsg)) return;

  showLoader(true);
  try {
    const { error } = await supabaseClient
      .from('orcamentos')
      .delete()
      .eq('id', rowIndex);
    
    if (error) throw error;
    
    showToast('success', 'Orçamento excluído permanentemente!');
    fetchData(true);
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
      btn.className = "px-5 py-3 sm:py-2.5 rounded-xl text-sm font-bold transition-all duration-200 bg-neonpurple text-white whitespace-nowrap min-h-[44px]";
    } else {
      btn.className = "px-5 py-3 sm:py-2.5 rounded-xl text-sm font-bold transition-all duration-200 text-slate-400 hover:text-white whitespace-nowrap min-h-[44px]";
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

// Enviar WhatsApp
async function sendWhatsApp(rowIndex) {
  const input = document.getElementById(`val-input-${rowIndex}`);
  const btn = document.getElementById(`btn-wa-${rowIndex}`);
  const quote = quotesData.find(q => q.rowIndex === rowIndex);
  
  if (!input || !btn || !quote) return;
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
    let telefone = String(quote.whatsapp).replace(/\D/g, '');
    if (!telefone) throw new Error("Cliente não possui número de WhatsApp cadastrado.");
    // Formatar número
    if (telefone.length === 9) telefone = '244' + telefone; // Angola default
    
    // Constrói a mensagem
    const mensagem = `Olá ${quote.nome}! Somos da Vem Limpeza.\nO orçamento para o seu serviço de ${quote.servico} ficou no valor de Kz ${valor}.\nGostaria de agendar?`;

    // Invoca a Edge Function 'send-whatsapp'
    const { data, error } = await supabaseClient.functions.invoke('send-whatsapp', {
      body: { 
        telefone: telefone, 
        mensagem: mensagem,
        orcamento_id: quote.id
      }
    });

    if (error) throw error;
    
    // Atualiza status na tabela de orçamentos
    await supabaseClient.from('orcamentos')
      .update({ status_envio: 'Enviado', valor_orcamento: valor })
      .eq('id', quote.id);
    
    showToast('success', 'Mensagem enviada pelo WhatsApp!');
    setTimeout(() => fetchData(true), 2000);
  } catch (error) {
    console.error(error);
    showToast('error', 'Falha no envio WhatsApp: ' + (error.message || 'Erro na nuvem'));
    fetchData(true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

// ============================================================
// CHAT REATIVO (REALTIME) E NOTIFICAÇÕES
// ============================================================
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1); // A4

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
  } catch(e) {
    console.error("Audio play falhou:", e);
  }
}

let realtimeChannel = null;

function initRealtime() {
  if (!supabaseClient) return;

  if (realtimeChannel) {
    supabaseClient.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabaseClient.channel('custom-insert-channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'whatsapp_mensagens' },
      (payload) => {
        const novaMensagem = payload.new;
        
        // Se for mensagem recebida (do cliente)
        if (novaMensagem.direcao === 'entrada') {
          playNotificationSound();
          
          const chatModal = document.getElementById('chatModal');
          const isChatOpen = !chatModal.classList.contains('hidden');
          const currentChatPhone = document.getElementById('chatPhone').value;
          
          // Encontrar o cliente
          const quote = quotesData.find(q => {
            let num = String(q.whatsapp || '').replace(/\D/g, '');
            if(num.length === 9) num = '244' + num;
            return num === novaMensagem.telefone_cliente;
          });
          
          const nomeCliente = quote ? `${quote.nome} ${quote.sobrenome}` : novaMensagem.telefone_cliente;
          
          if (isChatOpen && currentChatPhone === novaMensagem.telefone_cliente) {
            // O chat dessa pessoa está aberto! Atualiza as mensagens em tempo real
            const quoteId = document.getElementById('chatQuoteId').value;
            loadChatMessages(currentChatPhone, quoteId);
          } else {
            // Chat não está aberto, mostrar notificação verde e atualizar bolinha
            showToast('success', `Nova mensagem de ${nomeCliente}!`);
            if (quote) {
              quote.hasUnreadMsg = true;
              renderQuotes(); // Atualiza a lista na tela imediatamente
            }
          }
        }
      }
    )
    .subscribe();
}

// Lógica de Chat WhatsApp
function openChatModal(rowIndex) {
  const quote = quotesData.find(q => q.rowIndex === rowIndex);
  if (!quote) return;
  
  let telefone = String(quote.whatsapp).replace(/\D/g, '');
  if (telefone.length === 9) telefone = '244' + telefone;

  // Marcar chat como lido
  localStorage.setItem('chat_read_' + telefone, new Date().toISOString());
  if (quote.hasUnreadMsg) {
    quote.hasUnreadMsg = false;
    renderQuotes(); // Atualiza a UI para remover o indicador vermelho
  }

  document.getElementById('chatClientName').innerText = `${quote.nome} ${quote.sobrenome}`;
  document.getElementById('chatClientPhone').innerText = `+${telefone}`;
  document.getElementById('chatQuoteId').value = quote.id;
  document.getElementById('chatPhone').value = telefone;
  
  document.getElementById('chatModal').classList.remove('hidden');
  document.getElementById('chatModal').classList.add('flex');
  
  loadChatMessages(telefone, quote.id);
}

function closeChatModal() {
  document.getElementById('chatModal').classList.add('hidden');
  document.getElementById('chatModal').classList.remove('flex');
}

async function loadChatMessages(telefone, quoteId) {
  const msgContainer = document.getElementById('chatMessages');
  msgContainer.innerHTML = `<div class="flex items-center justify-center h-full relative z-10"><div class="w-10 h-10 border-4 border-[#00a884]/30 border-t-[#00a884] rounded-full animate-spin"></div></div>`;
  
  try {
    const { data, error } = await supabaseClient
      .from('whatsapp_mensagens')
      .select('*')
      .eq('telefone_cliente', telefone)
      .order('criado_em', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      msgContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-center text-[#8696a0] relative z-10">
          <div class="w-16 h-16 bg-[#f0f2f5] rounded-full flex items-center justify-center mb-3 shadow-sm border border-black/5">
            <i class="fa-regular fa-comments text-3xl opacity-60"></i>
          </div>
          <p class="text-sm font-medium">Nenhuma mensagem neste histórico.</p>
        </div>
      `;
      return;
    }

    msgContainer.innerHTML = '';
    data.forEach(msg => {
      const isOut = msg.direcao === 'saida';
      const timeStr = new Date(msg.criado_em).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
      
      const div = document.createElement('div');
      div.className = `flex w-full ${isOut ? 'justify-end' : 'justify-start'} animate-[slideUp_0.2s_ease] relative z-10`;
      div.innerHTML = `
        <div class="max-w-[85%] sm:max-w-[75%] px-3.5 py-2 sm:px-5 sm:py-2.5 text-[14px] sm:text-[15px] shadow-md backdrop-blur-sm ${isOut ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl rounded-tr-sm shadow-teal-500/20' : 'bg-gradient-to-br from-white to-slate-50 text-slate-800 rounded-2xl rounded-tl-sm border border-slate-100'}">
          <p class="whitespace-pre-wrap break-words leading-[1.5] ${isOut ? 'drop-shadow-sm' : ''}">${msg.mensagem}</p>
          <span class="text-[10px] sm:text-[11px] flex justify-end items-center mt-1.5 ${isOut ? 'text-teal-100' : 'text-slate-400'} font-medium tracking-tight">
            ${timeStr}
            ${isOut ? '<i class="fa-solid fa-check-double ml-1 opacity-90 drop-shadow-sm"></i>' : ''}
          </span>
        </div>
      `;
      msgContainer.appendChild(div);
    });

    // Scroll to bottom
    msgContainer.scrollTop = msgContainer.scrollHeight;

  } catch (error) {
    console.error(error);
    msgContainer.innerHTML = `<div class="text-rose-400 text-center text-sm p-4 relative z-10">Erro ao carregar mensagens.</div>`;
  }
}

async function sendChatMessage(e) {
  e.preventDefault();
  
  const input = document.getElementById('chatInputMsg');
  const quoteId = document.getElementById('chatQuoteId').value;
  const telefone = document.getElementById('chatPhone').value;
  const btn = document.getElementById('chatSendBtn');
  const visualBtn = document.getElementById('chatVisualSendBtn');
  
  const mensagem = input.value.trim();
  if (!mensagem) return;
  
  input.disabled = true;
  btn.disabled = true;
  if(visualBtn) visualBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin text-lg sm:text-xl"></i>';
  
  try {
    const { data, error } = await supabaseClient.functions.invoke('send-whatsapp', {
      body: { 
        telefone: telefone, 
        mensagem: mensagem,
        orcamento_id: quoteId
      }
    });

    if (error) throw error;
    
    input.value = '';
    input.style.height = ''; // reseta a altura da textarea
    loadChatMessages(telefone, quoteId);
  } catch (error) {
    console.error(error);
    showToast('error', 'Falha ao enviar mensagem.');
  } finally {
    input.disabled = false;
    btn.disabled = false;
    if(visualBtn) visualBtn.innerHTML = '<i class="fa-solid fa-paper-plane text-lg sm:text-xl ml-0.5"></i>';
    input.focus();
  }
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
  
  supabaseUrl = url;
  localStorage.setItem('supabase_url', url);
  if (window.supabase) supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
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
      const { data, error } = await supabaseClient.functions.invoke('send-email', {
        body: { quoteId: item.rowIndex, valor: item.valor }
      });
        
      if (error) throw error;
      successCount++;
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
  if (!supabaseClient) {
    showToast('warning', 'Supabase não conectado.');
    return;
  }

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

  showToast('warning', 'Eliminando orçamentos antigos do banco de dados...');

  try {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    
    const { data, error } = await supabaseClient
      .from('orcamentos')
      .delete()
      .lt('criado_em', d.toISOString())
      .eq('status_envio', 'Enviado');
      
    if (error) throw error;
    
    showToast('success', `Limpeza concluída!`);
    setTimeout(() => fetchData(true), 2000);
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

