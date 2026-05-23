/**
 * =====================================================
 * Google Apps Script — Vem Limpeza
 * Orquestrador de Orçamentos (Versão 100% Dinâmica e Resiliente)
 * =====================================================
 *
 * INSTRUÇÕES DE IMPLANTAÇÃO:
 * 1. Abra a sua Planilha Google associada ao Vem Limpeza.
 * 2. Clique em Extensões > Apps Script.
 * 3. Substitua TODO o código existente por este arquivo.
 * 4. Salve (Ctrl+S).
 * 5. Clique em "Implantar" > "Nova implantação".
 *    - Tipo: "Aplicativo Web"
 *    - Executar como: "Eu" (sua conta)
 *    - Quem tem acesso: "Qualquer pessoa"
 * 6. Clique em "Implantar" e copie a URL gerada.
 * 7. Cole essa URL no campo de Configurações do Painel
 *    (ícone de engrenagem no canto superior direito).
 *
 * ESTRUTURA PADRÃO ESPERADA (As colunas podem estar em qualquer ordem):
 * - Data (ou Date)
 * - Serviço (ou Servico)
 * - Comprimento
 * - Largura
 * - Lugares do Sofá (ou Lugares do sofa/Sófá)
 * - Tipo de Colchão (ou Tipo de colchao)
 * - Nome
 * - Sobrenome (ou Apelido)
 * - Email (ou E-mail)
 * - WhatsApp (ou Whats/Celular/Telefone)
 * - Foto URL (ou Foto/Imagem)
 * - Valor (ou Preço)
 * - Status
 */

// ============================
// Nome da aba da planilha
// ============================
var SHEET_NAME = 'Orçamentos';

// ============================
// Pasta do Google Drive para fotos
// ============================
var DRIVE_FOLDER_NAME = 'VemLimpeza_Fotos';

// =========================================================
// doGet — Requisições GET (leitura de dados pelo painel)
// Suporta JSONP para contornar restrições de CORS em domínios externos (Vercel)
// =========================================================
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
    var callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : '';

    var jsonResult;

    if (action === 'getQuotes') {
      jsonResult = getQuotesData();
    } else if (action === 'deleteQuote') {
      jsonResult = processDeleteQuote(e.parameter);
    } else if (action === 'sendQuote') {
      jsonResult = processSendQuote(e.parameter);
    } else if (action === 'cleanOldQuotes') {
      jsonResult = processCleanOldQuotes();
    } else {
      jsonResult = { success: true, message: 'API Vem Limpeza ativa.' };
    }

    var jsonString = JSON.stringify(jsonResult);

    // Se um callback JSONP foi fornecido, envolve a resposta
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + jsonString + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(jsonString)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    var errorJson = JSON.stringify({ success: false, error: error.toString() });
    var cb = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : '';
    
    if (cb) {
      return ContentService
        .createTextOutput(cb + '(' + errorJson + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(errorJson)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =========================================================
// doPost — Requisições POST (formulário do site + ações do painel)
// =========================================================
function doPost(e) {
  try {
    var data;

    // Tenta parsear o corpo da requisição (suporta JSON e text/plain)
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
    } else {
      throw new Error('Nenhum dado recebido.');
    }

    if (data.action) {
      if (data.action === 'sendQuote') return sendQuote(data);
      if (data.action === 'cleanOldQuotes') return cleanOldQuotes();
      if (data.action === 'deleteQuote') return deleteQuote(data);
      
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Ação inválida ou desconhecida: ' + data.action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return saveNewQuote(data);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =========================================================
// Helper para obter a aba ativa com maior flexibilidade
// =========================================================
function getActiveSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = null;
  
  var commonNames = [
    SHEET_NAME,
    'Orçamentos',
    'Orcamentos',
    'orçamentos',
    'orcamentos',
    'Orçamento',
    'Orcamento',
    'orcamento',
    'Sheet1',
    'Página1',
    'Página 1'
  ];
  
  for (var i = 0; i < commonNames.length; i++) {
    sheet = ss.getSheetByName(commonNames[i]);
    if (sheet) break;
  }
  
  if (!sheet) {
    var sheets = ss.getSheets();
    if (sheets.length > 0) {
      sheet = sheets[0];
    }
  }
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Ajusta a estrutura padrão se a planilha estiver completamente vazia
  try {
    var lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      sheet.appendRow([
        'Data', 'Serviço', 'Comprimento', 'Largura',
        'Lugares do Sofá', 'Tipo de Colchão',
        'Nome', 'Sobrenome', 'Email', 'WhatsApp',
        'Foto URL', 'Valor', 'Status'
      ]);
    }
  } catch (err) {
    Logger.log('Erro ao ajustar cabeçalho inicial: ' + err.toString());
  }
  
  return sheet;
}

// =========================================================
// Normalização de Cabeçalhos para Chaves Internas
// =========================================================
function normalizeHeaderKey(header) {
  if (!header) return '';
  var norm = header.toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]/g, ''); // remove caracteres especiais e espaços
  
  if (norm.indexOf('data') !== -1 || norm.indexOf('date') !== -1 || norm.indexOf('carimbo') !== -1) return 'date';
  if (norm.indexOf('servico') !== -1 || norm.indexOf('service') !== -1) return 'servico';
  if (norm.indexOf('comprimento') !== -1 || norm.indexOf('length') !== -1) return 'comprimento';
  if (norm.indexOf('largura') !== -1 || norm.indexOf('width') !== -1) return 'largura';
  if (norm.indexOf('dimens') !== -1 || norm.indexOf('medida') !== -1 || norm.indexOf('tamanho') !== -1) return 'dimensao';
  if (norm.indexOf('lugar') !== -1 || norm.indexOf('assento') !== -1 || norm.indexOf('seats') !== -1) return 'lugaresSofa';
  if (norm.indexOf('colchao') !== -1 || norm.indexOf('mattress') !== -1) return 'tipoColchao';
  if (norm.indexOf('sobrenome') !== -1 || norm.indexOf('apelido') !== -1 || norm.indexOf('lastname') !== -1) return 'sobrenome';
  if (norm.indexOf('nome') !== -1 || norm.indexOf('name') !== -1) return 'nome';
  if (norm.indexOf('email') !== -1 || norm.indexOf('mail') !== -1) return 'email';
  if (norm.indexOf('whatsapp') !== -1 || norm.indexOf('whats') !== -1 || norm.indexOf('celular') !== -1 || norm.indexOf('telefone') !== -1 || norm.indexOf('phone') !== -1) return 'whatsapp';
  if (norm.indexOf('foto') !== -1 || norm.indexOf('imagem') !== -1 || norm.indexOf('image') !== -1 || norm.indexOf('upload') !== -1) return 'fotoUrl';
  if (norm.indexOf('valor') !== -1 || norm.indexOf('preco') !== -1 || norm.indexOf('price') !== -1 || norm.indexOf('cost') !== -1) return 'valor';
  if (norm.indexOf('status') !== -1) return 'status';
  
  return norm; // Retorna a versão simplificada para colunas customizadas
}

// =========================================================
// Formatação Segura de Datas
// =========================================================
function safeFormatDate(value) {
  if (!value) return '';
  
  // Se for uma instância de Date
  if (value instanceof Date && !isNaN(value.getTime())) {
    try {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return value.toLocaleString();
    }
  }
  
  // Tenta converter se for string ou timestamp
  var parsedDate = new Date(value);
  if (!isNaN(parsedDate.getTime())) {
    try {
      return Utilities.formatDate(parsedDate, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return parsedDate.toLocaleString();
    }
  }
  
  return value.toString();
}

// =========================================================
// getQuotesData — Retorna os dados dos orçamentos como objeto JavaScript
// Usado internamente pelo doGet (suporta JSONP e JSON)
// =========================================================
function getQuotesData() {
  var sheet = getActiveSheet();

  if (!sheet) {
    return { success: false, error: 'Aba de orçamentos não encontrada.' };
  }

  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return { success: true, quotes: [] };
  }

  // Obter todos os cabeçalhos da primeira linha
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  
  // Obter todos os valores a partir da segunda linha
  var range = sheet.getRange(2, 1, lastRow - 1, lastColumn);
  var values = range.getValues();
  var quotes = [];

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var quote = {
      rowIndex: i + 2, // Índice real da linha física (2-indexed, pula o cabeçalho)
      extraData: {}    // Contém todas as informações adicionais
    };

    for (var j = 0; j < headers.length; j++) {
      var headerName = headers[j].toString().trim();
      if (!headerName) continue;

      var cellValue = row[j];
      
      // Formatação resiliente se for coluna de data ou objeto de data
      var normalized = normalizeHeaderKey(headerName);
      
      // Recuperação de dados caso o Google Sheets converta "2.5" em data (ex: 2 de Maio)
      if ((normalized === 'comprimento' || normalized === 'largura' || normalized === 'dimensao') && cellValue instanceof Date) {
        var day = cellValue.getDate();
        var month = cellValue.getMonth() + 1;
        cellValue = day + "." + month;
      } else if (normalized === 'date' || cellValue instanceof Date) {
        cellValue = safeFormatDate(cellValue);
      }

      // Evita notação científica no WhatsApp se a coluna for tratada como número no Sheets
      if (normalized === 'whatsapp' && cellValue !== null && cellValue !== undefined) {
        cellValue = cellValue.toString().trim();
        if (cellValue.indexOf('e') !== -1 || cellValue.indexOf('E') !== -1) {
          // Converte número em notação científica (ex: 5.51199E12) de volta para string inteira
          var tempVal = Number(cellValue);
          if (!isNaN(tempVal)) {
            cellValue = tempVal.toFixed(0);
          }
        }
      }

      // Preenche chaves conhecidas no objeto raiz
      quote[normalized] = cellValue;
      
      // Salva o valor original na aba de dados completos
      quote.extraData[headerName] = cellValue;
    }
    
    // Garante valores padrão em chaves essenciais se estiverem vazias
    if (!quote.status) quote.status = 'Pendente';

    quotes.push(quote);
  }

  return { success: true, quotes: quotes };
}

// =========================================================
// getQuotes — Wrapper de compatibilidade (retorna ContentService)
// =========================================================
function getQuotes() {
  var result = getQuotesData();
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// =========================================================
// sendQuote — Atualiza o valor e status de um orçamento
// =========================================================
function processSendQuote(data) {
  var sheet = getActiveSheet();

  if (!sheet) {
    return { success: false, error: 'Aba não encontrada.' };
  }

  var rowIndex = parseInt(data.rowIndex);
  var valor = data.valor || '';

  if (isNaN(rowIndex) || rowIndex < 2) {
    return { success: false, error: 'Índice de linha inválido.' };
  }

  var lastColumn = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  
  var colValorIdx = -1;
  var colStatusIdx = -1;
  var colEmailIdx = -1;
  var colNomeIdx = -1;
  var colServicoIdx = -1;

  for (var i = 0; i < headers.length; i++) {
    var norm = normalizeHeaderKey(headers[i]);
    if (norm === 'valor') colValorIdx = i + 1;
    if (norm === 'status') colStatusIdx = i + 1;
    if (norm === 'email') colEmailIdx = i + 1;
    if (norm === 'nome') colNomeIdx = i + 1;
    if (norm === 'servico') colServicoIdx = i + 1;
  }

  if (colValorIdx === -1) colValorIdx = 12; // L
  if (colStatusIdx === -1) colStatusIdx = 13; // M

  sheet.getRange(rowIndex, colValorIdx).setValue(valor);
  sheet.getRange(rowIndex, colStatusIdx).setValue('Enviado');

  try {
    var email = colEmailIdx !== -1 ? sheet.getRange(rowIndex, colEmailIdx).getValue() : '';
    var nome = colNomeIdx !== -1 ? sheet.getRange(rowIndex, colNomeIdx).getValue() : '';
    var servico = colServicoIdx !== -1 ? sheet.getRange(rowIndex, colServicoIdx).getValue() : '';

    if (email) {
      var subject = 'Vem Limpeza — Seu Orçamento Está Pronto!';
      var body = 'Olá ' + nome + ',\n\n' +
        'O orçamento para o serviço de ' + servico + ' foi concluído.\n' +
        'Valor: Kz ' + valor + '\n\n' +
        'Para confirmar ou tirar dúvidas, responda este e-mail ou entre em contato pelo WhatsApp.\n\n' +
        'Atenciosamente,\n' +
        'Equipe Vem Limpeza';

      MailApp.sendEmail(email, subject, body);
    }
  } catch (emailError) {
    Logger.log('Erro ao enviar e-mail: ' + emailError.toString());
  }

  return { success: true, message: 'Orçamento enviado com sucesso.' };
}

function sendQuote(data) {
  var result = processSendQuote(data);
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// =========================================================
// saveNewQuote — Salva um novo orçamento vindo do formulário
// =========================================================
function saveNewQuote(data) {
  var sheet = getActiveSheet();
  var lastColumn = sheet.getLastColumn();
  
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

  // Processar upload de foto (se houver)
  var fotoUrl = '';
  if (data.fileData && data.fileData.rawBase64) {
    try {
      fotoUrl = uploadPhoto(data.fileData);
    } catch (uploadError) {
      fotoUrl = 'Erro no upload: ' + uploadError.toString();
      Logger.log(uploadError);
    }
  }

  // Prepara a linha a ser inserida baseada nos cabeçalhos ativos
  var newRow = [];
  for (var i = 0; i < headers.length; i++) {
    var headerName = headers[i].toString().trim();
    var norm = normalizeHeaderKey(headerName);
    
    var val = '';
    if (norm === 'date') {
      val = new Date();
    } else if (norm === 'servico') {
      val = data['Serviço'] || data.servico || '';
    } else if (norm === 'comprimento') {
      val = data['Comprimento'] || data.comprimento || '';
      if (val) val = "'" + val; // Força texto para não virar data
    } else if (norm === 'largura') {
      val = data['Largura'] || data.largura || '';
      if (val) val = "'" + val; // Força texto para não virar data
    } else if (norm === 'dimensao') {
      val = data['Dimensão'] || data.dimensao || '';
      if (val) val = "'" + val; // Força texto para não virar data
    } else if (norm === 'lugaresSofa') {
      val = data['Lugares do sofa'] || data['Lugares do Sófá'] || data.lugaresSofa || '';
    } else if (norm === 'tipoColchao') {
      val = data['Tipo de colchão'] || data['Tipo de Colchão'] || data.tipoColchao || '';
    } else if (norm === 'nome') {
      val = data['Nome'] || data.nome || '';
    } else if (norm === 'sobrenome') {
      val = data['Sobrenome'] || data.sobrenome || '';
    } else if (norm === 'email') {
      val = data['Email'] || data.email || '';
    } else if (norm === 'whatsapp') {
      val = data['WhatsApp'] || data.whatsapp || '';
    } else if (norm === 'fotoUrl') {
      val = fotoUrl || data.fotoUrl || '';
    } else if (norm === 'valor') {
      val = ''; 
    } else if (norm === 'status') {
      val = 'Pendente';
    } else {
      // Tenta obter de campos customizados enviados pelo form
      val = data[headerName] || data[norm] || '';
    }
    
    newRow.push(val);
  }

  sheet.appendRow(newRow);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: 'Orçamento recebido com sucesso.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// =========================================================
// uploadPhoto — Faz upload da foto para o Google Drive
// =========================================================
function uploadPhoto(fileData) {
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  var folder;

  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
  }

  var blob = Utilities.newBlob(
    Utilities.base64Decode(fileData.rawBase64),
    fileData.mimeType || 'image/jpeg',
    fileData.fileName || 'foto_orcamento.jpg'
  );

  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return 'https://drive.google.com/file/d/' + file.getId() + '/view';
}

// =========================================================
// cleanOldQuotes — Apaga orçamentos "Enviado" com mais de 14 dias
// =========================================================
function processCleanOldQuotes() {
  var sheet = getActiveSheet();

  if (!sheet) {
    return { success: false, error: 'Aba não encontrada.' };
  }

  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return { success: true, deleted: 0, message: 'Nenhum dado para limpar.' };
  }

  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

  var colDateIdx = -1;
  var colStatusIdx = -1;
  for (var i = 0; i < headers.length; i++) {
    var norm = normalizeHeaderKey(headers[i]);
    if (norm === 'date') colDateIdx = i;
    if (norm === 'status') colStatusIdx = i;
  }

  if (colDateIdx === -1 || colStatusIdx === -1) {
    return { success: false, error: 'Colunas de Data ou Status não encontradas.' };
  }

  var now = new Date();
  var twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
  var rowsToDelete = [];

  for (var r = 0; r < values.length; r++) {
    var status = (values[r][colStatusIdx] || '').toString().toLowerCase().trim();
    if (status !== 'enviado') continue;

    var dateVal = values[r][colDateIdx];
    var rowDate = null;

    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      rowDate = dateVal;
    } else if (dateVal) {
      rowDate = new Date(dateVal);
      if (isNaN(rowDate.getTime())) rowDate = null;
    }

    if (!rowDate) continue;

    var ageMs = now.getTime() - rowDate.getTime();
    if (ageMs >= twoWeeksMs) {
      rowsToDelete.push(r + 2);
    }
  }

  rowsToDelete.sort(function(a, b) { return b - a; });
  for (var d = 0; d < rowsToDelete.length; d++) {
    sheet.deleteRow(rowsToDelete[d]);
  }

  return {
    success: true,
    deleted: rowsToDelete.length,
    message: rowsToDelete.length > 0
      ? rowsToDelete.length + ' orçamento(s) antigo(s) eliminado(s) com sucesso.'
      : 'Nenhum orçamento com mais de 14 dias encontrado.'
  };
}

function cleanOldQuotes() {
  var result = processCleanOldQuotes();
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// =========================================================
// deleteQuote — Apaga um orçamento específico (apenas se > 24h)
// =========================================================
function processDeleteQuote(data) {
  var sheet = getActiveSheet();

  if (!sheet) {
    return { success: false, error: 'Aba não encontrada.' };
  }

  var rowIndex = parseInt(data.rowIndex);

  if (isNaN(rowIndex) || rowIndex < 2) {
    return { success: false, error: 'Índice de linha inválido.' };
  }

  var lastColumn = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var colDateIdx = -1;
  
  for (var i = 0; i < headers.length; i++) {
    if (normalizeHeaderKey(headers[i]) === 'date') {
      colDateIdx = i + 1;
      break;
    }
  }

  if (colDateIdx !== -1) {
    var dateVal = sheet.getRange(rowIndex, colDateIdx).getValue();
    var rowDate = null;

    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      rowDate = dateVal;
    } else if (dateVal) {
      var dateStr = String(dateVal);
      var parts = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
      if (parts) {
        rowDate = new Date(parts[3], parts[2] - 1, parts[1], parts[4] || 0, parts[5] || 0);
      } else {
        rowDate = new Date(dateVal);
      }
      if (isNaN(rowDate.getTime())) rowDate = null;
    }

    if (rowDate) {
      // Usar fuso horário tolerante: considera apenas se for flagrantemente menor que 23 horas para evitar falsos positivos de fuso
      var ageMs = new Date().getTime() - rowDate.getTime();
      if (ageMs < 23 * 60 * 60 * 1000) {
        return { success: false, error: 'O orçamento deve ter mais de 24 horas de existência para ser eliminado. Tente novamente mais tarde.' };
      }
    }
  }

  sheet.deleteRow(rowIndex);

  return { success: true, message: 'Orçamento eliminado com sucesso.' };
}

function deleteQuote(data) {
  var result = processDeleteQuote(data);
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
