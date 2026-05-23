// Lógica do Dashboard - Clean&Co.

let quotesData = [];
let currentFilter = 'all'; // all, pending, sent, error
let apiURL = localStorage.getItem('google_apps_script_url') || 'https://script.google.com/macros/s/AKfycbzpZQYuE-rg0BOajGrYA3Cg0yZAZgaDeJvmBY2N6r_PsSbfD95RqZpnxmThAo1Kw46I/exec';

// Inicialização
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
    fetchData();
  }
}

// Conectar e buscar dados
async function fetchData() {
  if (!apiURL) return;
  
  showLoader(true);
  updateConnectionBadge('connecting');
  
  try {
    const response = await fetch(`${apiURL}?action=getQuotes`, {
      method: 'GET',
      mode: 'cors'
    });
    
    if (!response.ok) throw new Error('Falha HTTP: ' + response.status);
    
    const result = await response.json();
    
    if (result.success) {
      quotesData = result.quotes;
      updateStats();
      renderQuotes();
      updateConnectionBadge('connected');
      showToast('success', 'Planilha sincronizada com sucesso!');
    } else {
      throw new Error(result.error || 'Erro desconhecido da API');
    }
  } catch (error) {
    console.error(error);
    updateConnectionBadge('error');
    showToast('error', 'Falha ao sincronizar: ' + error.message);
    
    if (quotesData.length === 0) {
      document.getElementById('emptyState').classList.remove('hidden');
    }
  } finally {
    showLoader(false);
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
    card.className = 'glass p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between neon-border-glow transition-all duration-300';
    
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
        <div class="relative w-full h-40 rounded-2xl overflow-hidden mb-4 group cursor-pointer border border-white/5 bg-slate-900/40" onclick="openImageModal('${cleanImgUrl}', '${quote.nome} ${quote.sobrenome}')">
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
    if (quote.comprimento && quote.largura) detailLines.push(`<span class="px-2.5 py-1 rounded-lg bg-white/5 text-[11px] font-semibold text-slate-300 border border-white/5"><i class="fa-solid fa-maximize mr-1 text-neonpurple"></i>${quote.comprimento}x${quote.largura}m</span>`);
    
    const detailsHtml = detailLines.length > 0 
      ? `<div class="flex flex-wrap gap-2 mb-4">${detailLines.join('')}</div>`
      : '';
      
    const waLink = quote.whatsapp 
      ? `<a href="https://wa.me/${quote.whatsapp.replace(/\D/g, '')}" target="_blank" class="text-emerald-400 hover:text-emerald-300 transition text-xs font-semibold flex items-center mt-1"><i class="fa-brands fa-whatsapp mr-1.5 text-sm"></i>${quote.whatsapp}</a>`
      : '<span class="text-xs text-slate-500 flex items-center mt-1"><i class="fa-solid fa-phone-slash mr-1.5"></i>Sem número</span>';

    let footerAction = '';
    const isPendingCard = statusLower !== 'enviado' && statusLower !== 'erro';
    
    if (isPendingCard) {
      footerAction = `
        <div class="mt-5 pt-4 border-t border-white/5">
          <label class="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Inserir Valor e Enviar</label>
          <div class="flex space-x-2">
            <div class="relative flex-1">
              <span class="absolute left-3.5 top-2.5 text-xs font-semibold text-slate-400">R$</span>
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
      footerAction = `
        <div class="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
          <div>
            <span class="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Valor Enviado</span>
            <span class="text-lg font-bold font-title text-white">R$ ${quote.valor || '0,00'}</span>
          </div>
          <button onclick="resendPrompt(${quote.rowIndex}, '${quote.valor}')" class="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition text-[10px] font-bold">
            <i class="fa-solid fa-rotate-right mr-1"></i> Reenviar
          </button>
        </div>
      `;
    }

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between mb-4">
          <div>
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">${quote.date || 'Sem data'}</span>
            <h4 class="text-base font-title font-bold text-white mt-1">${quote.nome} ${quote.sobrenome}</h4>
            <span class="text-xs text-slate-400 block max-w-full overflow-hidden text-ellipsis">${quote.email}</span>
            ${waLink}
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
    const response = await fetch(apiURL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'sendQuote',
        rowIndex: rowIndex,
        valor: valor
      })
    });
    
    if (!response.ok) throw new Error('Erro na requisição: ' + response.status);
    const result = await response.json();
    
    if (result.success) {
      showToast('success', 'Orçamento disparado com sucesso!');
      fetchData();
    } else {
      throw new Error(result.error || 'Erro no envio');
    }
  } catch (error) {
    console.error(error);
    showToast('error', 'Falha no envio: ' + error.message);
    fetchData();
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

// Limpar orçamentos antigos
async function cleanOldQuotes() {
  if (!apiURL) return;
  
  if (!confirm("Tem certeza que deseja apagar permanentemente os orçamentos ENVIADOS há mais de 2 semanas?")) {
    return;
  }
  
  showLoader(true);
  
  try {
    const response = await fetch(apiURL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'cleanOldQuotes'
      })
    });
    
    if (!response.ok) throw new Error('Falha HTTP: ' + response.status);
    
    const result = await response.json();
    
    if (result.success) {
      showToast('success', result.message || 'Limpeza concluída com sucesso!');
      fetchData(); // Recarrega os dados
    } else {
      throw new Error(result.error || 'Erro na limpeza');
    }
  } catch (error) {
    console.error(error);
    showToast('error', 'Falha ao limpar: ' + error.message);
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

function closeImageModal() {
  const modal = document.getElementById('imageModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
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
