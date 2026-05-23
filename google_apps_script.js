// ==========================================
// CONFIGURAÇÕES GERAIS
// ==========================================
const sheetName = 'Orcamento'; 

// COLE O ID DA SUA PASTA DO GOOGLE DRIVE AQUI ENTRE AS ASPAS:
const folderId = '1OdBOm_ImHp7u4XcK94a6bgKmMapcr2Wl'; 

const scriptProp = PropertiesService.getScriptProperties();

// Executar uma vez no editor do Apps Script se for criar uma nova planilha do zero
function initialSetup() {
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  scriptProp.setProperty('key', activeSpreadsheet.getId());
}

// Resposta amigável para acessos diretos no navegador ou solicitações do Painel Web
function doGet(e) {
  // Verifica se é a chamada do nosso Painel Web buscando dados
  if (e && e.parameter && e.parameter.action === "getQuotes") {
    return handleGetQuotes();
  }

  // Resposta padrão caso seja acessado no navegador diretamente
  var html = '<html><head>' +
             '<title>Integração Vem Limpeza</title>' +
             '<meta name="viewport" content="width=device-width, initial-scale=1">' +
             '<style>' +
             'body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background-color: #0A0A14; color: #FAF8F5; text-align: center; padding: 50px 20px; margin: 0; }' +
             '.container { max-width: 600px; margin: 0 auto; background: #13131F; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #232335; }' +
             'h1 { color: #7B61FF; margin-bottom: 20px; }' +
             'p { font-size: 1.1em; line-height: 1.6; color: #B3B3C6; }' +
             '.status-badge { display: inline-block; background: #10B981; color: #fff; padding: 8px 16px; border-radius: 50px; font-weight: bold; margin-top: 20px; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }' +
             '</style>' +
             '</head><body>' +
             '<div class="container">' +
             '<h1>🧹 Vem Limpeza</h1>' +
             '<p>O serviço de integração com a Planilha de Orçamentos do Google Sheets está <strong>Ativo e Operacional</strong>!</p>' +
             '<p>Envie os orçamentos diretamente através do formulário do site.</p>' +
             '<div class="status-badge">● Sistema Operacional</div>' +
             '</div>' +
             '</body></html>';
  return HtmlService.createHtmlOutput(html);
}

// Processador de requisições POST vindo do Modal do site E do Painel Web
function doPost(e) {
  var postData;
  try {
    postData = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "JSON inválido: " + err.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }

  // ==========================================
  // DISPARO DE E-MAIL DO PAINEL WEB
  // ==========================================
  if (postData && postData.action === "sendQuote") {
    return handleSendQuote(postData);
  }

  // ==========================================
  // LIMPEZA DE ORÇAMENTOS ANTIGOS DO PAINEL WEB
  // ==========================================
  if (postData && postData.action === "cleanOldQuotes") {
    return handleCleanOldQuotes();
  }

  // ==========================================
  // GRAVAÇÃO DE LEADS (MÓDULO ORIGINAL DO SITE)
  // ==========================================
  const lock = LockService.getScriptLock();
  // Aguarda até 10 segundos para obter acesso exclusivo e evitar conflito de gravação simultânea
  lock.tryLock(10000);

  try {
    let fileUrl = '';
    let uploadError = '';

    // ==========================================
    // UPLOAD DE FOTO (COM ISOLAMENTO DE ERROS)
    // ==========================================
    if (postData.fileData && (postData.fileData.base64 || postData.fileData.rawBase64)) {
      try {
        let folder;
        // Valida se o folderId foi inserido e não é o valor de exemplo
        if (folderId && folderId !== 'COLE_O_ID_DA_PASTA_AQUI' && folderId.trim() !== '') {
          try {
            folder = DriveApp.getFolderById(folderId.trim());
          } catch (fErr) {
            // Se o ID for inválido ou inacessível, salva na raiz do Drive
            folder = DriveApp.getRootFolder();
          }
        } else {
          folder = DriveApp.getRootFolder();
        }

        // Extrai a string Base64 pura
        let base64Str = '';
        if (postData.fileData.rawBase64) {
          base64Str = postData.fileData.rawBase64;
        } else if (postData.fileData.base64) {
          base64Str = postData.fileData.base64.split(',')[1];
        }

        if (base64Str) {
          const decodedData = Utilities.base64Decode(base64Str);
          const mimeType = postData.fileData.mimeType || 'image/jpeg';
          const fileName = postData.fileData.fileName || 'foto_' + new Date().getTime() + '.jpg';
          const blob = Utilities.newBlob(decodedData, mimeType, fileName);
          const file = folder.createFile(blob);
          
          // Tenta aplicar compartilhamento público ao arquivo
          try {
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (sharingErr) {
            // Ignora se as políticas do domínio corporativo Google impedirem
          }
          
          fileUrl = file.getUrl();
        } else {
          uploadError = '[Erro: Payload Base64 vazio]';
        }
      } catch (uploadErr) {
        // Grava o erro na planilha em vez de estourar exceção para o usuário final!
        uploadError = '[Erro no upload: ' + uploadErr.toString() + ']';
      }
    }

    // ==========================================
    // GRAVAÇÃO RESILIENTE NA PLANILHA
    // ==========================================
    const doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
    let sheet = doc.getSheetByName(sheetName);
    if (!sheet) {
      // Caso a aba com o nome configurado não exista, pega a primeira aba para evitar que o script quebre
      sheet = doc.getSheets()[0];
    }
    
    // Obtém cabeçalhos da primeira linha
    let headers = [];
    if (sheet.getLastColumn() > 0) {
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    } else {
      // Caso a planilha esteja vazia, cria a estrutura padrão de 13 colunas
      headers = ['Data', 'Serviço', 'Comprimento', 'Largura', 'Lugares do sofa', 'Tipo de colchão', 'Nome', 'Sobrenome', 'Email', 'WhatsApp', 'Foto URL', 'Valor do Orçamento', 'Status do Envio'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    const nextRow = sheet.getLastRow() + 1;

    // Mapeamento flexível de colunas (Case-Insensitive e Sem Acentos)
    const newRow = headers.map(function(header) {
      const cleanHeader = header.toString().trim();
      
      // Regras e valores padrão para colunas de controle
      if (cleanHeader === 'Data') return new Date();
      if (cleanHeader === 'Foto URL') return fileUrl || uploadError || 'Sem foto';
      if (cleanHeader === 'Valor do Orçamento') return '';
      if (cleanHeader === 'Status do Envio') return 'Pendente';
      
      // Busca a chave correspondente no payload enviado
      const foundKey = Object.keys(postData).find(function(key) {
        return key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 
               cleanHeader.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      });
      
      return foundKey ? postData[foundKey] : '';
    });

    // Grava a linha na planilha
    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);

    return ContentService
      .createTextOutput(JSON.stringify({ 
        'result': 'success', 
        'row': nextRow, 
        'imageUrl': fileUrl, 
        'uploadError': uploadError 
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    // Libera o bloqueio concorrente
    lock.releaseLock();
  }
}


function normalizeHeader(header) {
  if (!header) return "";
  var normalized = header.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove acentos
  return normalized.toLowerCase()
    .replace(/-/g, "")
    .replace(/\s+/g, "")
    .trim();
}

// Retorna todos os orçamentos para o Painel Web
function handleGetQuotes() {
  try {
    const doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
    let sheet = doc.getSheetByName(sheetName);
    if (!sheet) sheet = doc.getSheets()[0];
    
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, quotes: [] }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    var headers = data[0];
    var headerMap = {};
    for (var i = 0; i < headers.length; i++) {
      headerMap[normalizeHeader(headers[i])] = i;
    }
    
    var idxNome = headerMap['nome'] !== undefined ? headerMap['nome'] : 6;
    var idxSobrenome = headerMap['sobrenome'] !== undefined ? headerMap['sobrenome'] : 7;
    var idxEmail = headerMap['email'] !== undefined ? headerMap['email'] : 8;
    var idxServico = headerMap['servico'] !== undefined ? headerMap['servico'] : 1;
    var idxComprimento = headerMap['comprimento'] !== undefined ? headerMap['comprimento'] : 2;
    var idxLargura = headerMap['largura'] !== undefined ? headerMap['largura'] : 3;
    var idxWhatsApp = headerMap['whatsapp'] !== undefined ? headerMap['whatsapp'] : 9;
    var idxFotoUrl = headerMap['fotourl'] !== undefined ? headerMap['fotourl'] : 10;
    
    var idxValor = headerMap['valordoorcamento'] !== undefined ? headerMap['valordoorcamento'] : 11;
    if (headerMap['valordoorcamento'] === undefined && headerMap['valor'] !== undefined) {
      idxValor = headerMap['valor'];
    }
    
    var idxStatus = headerMap['statusdoenvio'] !== undefined ? headerMap['statusdoenvio'] : 12;
    if (headerMap['statusdoenvio'] === undefined && headerMap['status'] !== undefined) {
      idxStatus = headerMap['status'];
    }
    
    var idxLugares = headerMap['lugaresdosofa'] !== undefined ? headerMap['lugaresdosofa'] : -1;
    var idxColchao = headerMap['tipodecolchao'] !== undefined ? headerMap['tipodecolchao'] : -1;
    
    var quotes = [];
    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var status = row[idxStatus] ? row[idxStatus].toString().trim() : "";
      var valor = row[idxValor] ? row[idxValor].toString().trim() : "";
      var nome = row[idxNome] ? row[idxNome].toString().trim() : "";
      var sobrenome = row[idxSobrenome] ? row[idxSobrenome].toString().trim() : "";
      
      quotes.push({
        rowIndex: r + 1,
        date: row[0] ? row[0].toString() : "",
        servico: row[idxServico] ? row[idxServico].toString().trim() : "",
        comprimento: row[idxComprimento] ? row[idxComprimento].toString().trim() : "",
        largura: row[idxLargura] ? row[idxLargura].toString().trim() : "",
        lugaresSofa: idxLugares !== -1 && row[idxLugares] ? row[idxLugares].toString().trim() : "",
        tipoColchao: idxColchao !== -1 && row[idxColchao] ? row[idxColchao].toString().trim() : "",
        nome: nome,
        sobrenome: sobrenome,
        email: row[idxEmail] ? row[idxEmail].toString().trim() : "",
        whatsapp: row[idxWhatsApp] ? row[idxWhatsApp].toString().trim() : "",
        fotoUrl: row[idxFotoUrl] ? row[idxFotoUrl].toString().trim() : "",
        valor: valor,
        status: status
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, quotes: quotes }))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

// Dispara e-mail de orçamento e atualiza status na planilha
function handleSendQuote(postData) {
  try {
    var rowIndex = postData.rowIndex;
    var valorDigitado = postData.valor;
    
    if (!rowIndex || !valorDigitado) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Linha ou Valor ausentes" }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    const doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
    let sheet = doc.getSheetByName(sheetName);
    if (!sheet) sheet = doc.getSheets()[0];
    
    var data = sheet.getDataRange().getValues();
    
    var headers = data[0];
    var headerMap = {};
    for (var i = 0; i < headers.length; i++) {
      headerMap[normalizeHeader(headers[i])] = i;
    }
    
    var idxNome = headerMap['nome'] !== undefined ? headerMap['nome'] : 6;
    var idxSobrenome = headerMap['sobrenome'] !== undefined ? headerMap['sobrenome'] : 7;
    var idxEmail = headerMap['email'] !== undefined ? headerMap['email'] : 8;
    var idxServico = headerMap['servico'] !== undefined ? headerMap['servico'] : 1;
    var idxComprimento = headerMap['comprimento'] !== undefined ? headerMap['comprimento'] : 2;
    var idxLargura = headerMap['largura'] !== undefined ? headerMap['largura'] : 3;
    
    var idxValor = headerMap['valordoorcamento'] !== undefined ? headerMap['valordoorcamento'] : 11;
    if (headerMap['valordoorcamento'] === undefined && headerMap['valor'] !== undefined) {
      idxValor = headerMap['valor'];
    }
    
    var idxStatus = headerMap['statusdoenvio'] !== undefined ? headerMap['statusdoenvio'] : 12;
    if (headerMap['statusdoenvio'] === undefined && headerMap['status'] !== undefined) {
      idxStatus = headerMap['status'];
    }
    
    var idxLugares = headerMap['lugaresdosofa'] !== undefined ? headerMap['lugaresdosofa'] : -1;
    var idxColchao = headerMap['tipodecolchao'] !== undefined ? headerMap['tipodecolchao'] : -1;
    
    var rowData = data[rowIndex - 1];
    if (!rowData) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Linha não encontrada" }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    var email = rowData[idxEmail] ? rowData[idxEmail].toString().trim() : "";
    var servico = rowData[idxServico] ? rowData[idxServico].toString().trim() : "";
    var comprimento = rowData[idxComprimento] ? rowData[idxComprimento].toString().trim() : "";
    var largura = rowData[idxLargura] ? rowData[idxLargura].toString().trim() : "";
    var nome = rowData[idxNome] ? rowData[idxNome].toString().trim() : "";
    var sobrenome = rowData[idxSobrenome] ? rowData[idxSobrenome].toString().trim() : "";
    var nomeCompleto = (nome + " " + sobrenome).trim();
    
    var lugaresSofa = idxLugares !== -1 && rowData[idxLugares] ? rowData[idxLugares].toString().trim() : "";
    var tipoColchao = idxColchao !== -1 && rowData[idxColchao] ? rowData[idxColchao].toString().trim() : "";
    
    if (!email || email.indexOf("@") === -1) {
      sheet.getRange(rowIndex, idxStatus + 1).setValue("ERRO");
      sheet.getRange(rowIndex, idxValor + 1).setValue(valorDigitado);
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "E-mail inválido na planilha" }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Atualiza valor na planilha primeiro
    sheet.getRange(rowIndex, idxValor + 1).setValue(valorDigitado);
    
    // Preparar especificações para o e-mail
    var specs = [];
    if (lugaresSofa) specs.push(lugaresSofa);
    if (tipoColchao) specs.push(tipoColchao);
    if (comprimento && largura) {
      try {
        if (parseFloat(comprimento) > 0 && parseFloat(largura) > 0) {
          specs.push("medidas de " + comprimento + "m x " + largura + "m");
        }
      } catch (e) {
        specs.push("medidas de " + comprimento + " x " + largura);
      }
    }
    
    var specsStr = specs.length > 0 ? " (" + specs.join(", ") + ")" : "";
    var saudacao = nomeCompleto ? "Olá, " + nomeCompleto + "!" : "Olá!";
    
    var htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
        <style>
            body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #e9e9e9; }
            .wrapper { max-width: 600px; margin: 0 auto; background-color: #5C32F0; overflow: hidden; }
            .top-bar { padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; color: white; font-family: 'Fredoka', sans-serif; border-bottom: 2px dashed rgba(255,255,255,0.2); margin-bottom: 20px; }
            .top-bar-title { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
            
            .hero { padding: 10px 40px 30px 40px; text-align: left; }
            .hero h1 { color: #ffffff; font-family: 'Fredoka', sans-serif; font-size: 42px; line-height: 1.1; margin: 0 0 25px 0; letter-spacing: 0.5px; }
            
            .main-image { width: 100%; border-radius: 12px; margin-bottom: 25px; object-fit: cover; border: 4px solid #ffffff; height: auto; }
            
            .details { color: #ffffff; font-size: 16px; line-height: 1.5; text-align: center; margin-bottom: 30px; }
            .details strong { font-weight: 600; color: #FFD166; }
            
            .cta-container { text-align: center; margin-bottom: 20px; }
            .cta-button { display: inline-block; background-color: #ffffff; color: #5C32F0; text-decoration: none; padding: 18px 40px; font-family: 'Fredoka', sans-serif; font-size: 22px; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 0 rgba(0,0,0,0.1); }
            
            .wave-divider { width: 100%; height: auto; display: block; margin-bottom: -1px; }
            
            .bottom-section { background-color: #FFF5F8; padding: 40px; text-align: center; color: #1a1a1a; }
            .bottom-section h2 { font-family: 'Fredoka', sans-serif; font-size: 32px; margin: 0 0 15px 0; letter-spacing: -0.5px; }
            .bottom-section p { font-size: 16px; margin-bottom: 30px; color: #444; line-height: 1.5; }
            
            .whatsapp-btn { display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; padding: 16px 35px; border-radius: 50px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4); text-align: center; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="top-bar">
                <div class="top-bar-title" style="color:white;font-weight:bold;font-size:24px;">Clean&Co.</div>
            </div>
            
            <div class="hero">
                <h1 style="color:white;font-size:38px;margin-bottom:20px;">Seu orçamento<br>está pronto!</h1>
                
                <img class="main-image" src="https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&q=80&w=800" alt="Limpeza Profissional">
                
                <div class="details" style="color:white;font-size:16px;">
                    ${saudacao}<br><br>
                    Analisamos os detalhes para a <strong>${servico}</strong>${specsStr} e preparamos uma cotação exclusiva para deixar tudo brilhando.
                </div>
                
                <div class="cta-container" style="margin-top:25px;">
                    <div class="cta-button" style="color:#5C32F0;background-color:white;padding:15px 30px;font-size:20px;border-radius:8px;font-weight:bold;display:inline-block;">Valor: R$ ${valorDigitado}</div>
                </div>
            </div>
            
            <div class="bottom-section" style="background-color:#FFF5F8;padding:35px;text-align:center;">
                <h2 style="font-size:28px;margin-bottom:10px;">Vamos agendar?</h2>
                <p style="font-size:15px;color:#444;">Cada detalhe conta para uma limpeza perfeita. Se o valor estiver de acordo, clique abaixo para falar diretamente com a nossa equipe no WhatsApp e agendar o serviço.</p>
                <a href="https://wa.me/244927558203" class="whatsapp-btn" style="background-color:#25D366;color:white;padding:12px 30px;border-radius:25px;font-weight:bold;text-decoration:none;display:inline-block;">Falar no WhatsApp</a>
            </div>
        </div>
    </body>
    </html>
    `;
    
    // Disparar o e-mail usando a conta do Gmail do Apps Script
    GmailApp.sendEmail(email, "Orçamento Pronto: " + servico, "Seu cliente de e-mail não suporta HTML. O valor do orçamento para " + servico + " é R$ " + valorDigitado + ".", {
      htmlBody: htmlContent
    });
    
    // Atualiza status para ENVIADO na planilha
    sheet.getRange(rowIndex, idxStatus + 1).setValue("ENVIADO");
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "E-mail enviado e planilha atualizada!" }))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch (err) {
    try {
      const doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
      let sheet = doc.getSheetByName(sheetName);
      if (!sheet) sheet = doc.getSheets()[0];
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var headerMap = {};
      for (var i = 0; i < headers.length; i++) {
        headerMap[normalizeHeader(headers[i])] = i;
      }
      var idxStatus = headerMap['statusdoenvio'] !== undefined ? headerMap['statusdoenvio'] : 12;
      if (headerMap['statusdoenvio'] === undefined && headerMap['status'] !== undefined) {
        idxStatus = headerMap['status'];
      }
      sheet.getRange(postData.rowIndex, idxStatus + 1).setValue("ERRO");
    } catch (e) {}
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

// Limpa orçamentos enviados há mais de 2 semanas
function handleCleanOldQuotes() {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
    let sheet = doc.getSheetByName(sheetName);
    if (!sheet) sheet = doc.getSheets()[0];
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
       return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Nenhum dado para limpar." }))
                            .setMimeType(ContentService.MimeType.JSON);
    }
    
    var headers = data[0];
    var headerMap = {};
    for (var i = 0; i < headers.length; i++) {
      headerMap[normalizeHeader(headers[i])] = i;
    }
    
    var idxStatus = headerMap['statusdoenvio'] !== undefined ? headerMap['statusdoenvio'] : 12;
    if (headerMap['statusdoenvio'] === undefined && headerMap['status'] !== undefined) {
      idxStatus = headerMap['status'];
    }
    
    var twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    var deletedCount = 0;
    // Iterar de baixo para cima para evitar problemas de índice ao deletar linhas
    for (var r = data.length - 1; r >= 1; r--) {
      var row = data[r];
      var status = row[idxStatus] ? row[idxStatus].toString().trim().toUpperCase() : "";
      
      if (status === "ENVIADO") {
        var rowDate = new Date(row[0]);
        if (!isNaN(rowDate.getTime()) && rowDate < twoWeeksAgo) {
          sheet.deleteRow(r + 1); // r + 1 porque as linhas do sheet são indexadas em 1
          deletedCount++;
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: deletedCount + " orçamentos antigos removidos com sucesso." }))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
