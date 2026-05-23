const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Diretórios e chaves
const projectDir = __dirname;
const gitRepoDir = fs.existsSync(path.join(path.dirname(projectDir), '.git')) ? path.dirname(projectDir) : projectDir;

console.log('\x1b[35m=== Monitor de Código do Vem Limpeza ===\x1b[0m');
console.log(`Pasta monitorada: ${gitRepoDir}`);

let isPrompting = false;
let debounceTimeout = null;

// Função para perguntar ao usuário
function promptUser() {
  if (isPrompting) return;
  isPrompting = true;
  
  console.log('\n\x1b[33m[ALTERAÇÃO DETECTADA] Foram salvas alterações nos arquivos do projeto.\x1b[0m');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Deseja enviar (commit & push) essas atualizações para o GitHub? (S/N)\n> ', (answer) => {
    rl.close();
    const cleanAnswer = answer.trim().toLowerCase();
    
    if (cleanAnswer === 's' || cleanAnswer === 'sim') {
      console.log('\n\x1b[32mIniciando commit e push no GitHub...\x1b[0m');
      try {
        execSync('node update_github.cjs', { cwd: projectDir, stdio: 'inherit' });
      } catch (err) {
        console.error('\n\x1b[31mErro durante o envio:\x1b[0m', err.message);
      }
    } else {
      console.log('\x1b[33mEnvio ignorado. Continuando monitoramento de alterações...\x1b[0m');
    }
    
    // Pequeno intervalo de segurança antes de permitir nova pergunta
    setTimeout(() => {
      isPrompting = false;
      console.log('\n\x1b[36mAguardando novas alterações...\x1b[0m');
    }, 3000);
  });
}

// Valida se o arquivo alterado é de código relevante
function isValidChange(eventType, filename) {
  if (!filename) return false;
  
  const fullPath = path.join(gitRepoDir, filename);
  
  // Ignora pastas internas do Git, build, logs, lockfiles e node_modules
  const excludedPatterns = [
    /[\\\/]\.git[\\\/]/,
    /[\\\/]node_modules[\\\/]/,
    /[\\\/]dist[\\\/]/,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /\.DS_Store$/
  ];
  
  for (const pattern of excludedPatterns) {
    if (pattern.test(filename) || pattern.test(fullPath)) {
      return false;
    }
  }
  
  // Extensões de arquivos de código válidos
  const validExtensions = ['.js', '.jsx', '.html', '.css', '.json', '.cjs', '.ts', '.tsx'];
  const ext = path.extname(filename).toLowerCase();
  
  return validExtensions.includes(ext);
}

// Inicia monitoramento nativo no Windows (recursivo)
try {
  console.log('\x1b[36mMonitor de alterações ativo (Pressione Ctrl+C para encerrar)...\x1b[0m');
  
  fs.watch(gitRepoDir, { recursive: true }, (eventType, filename) => {
    if (isPrompting) return;
    
    if (isValidChange(eventType, filename)) {
      // Debounce para esperar a gravação do arquivo concluir (3 segundos)
      if (debounceTimeout) clearTimeout(debounceTimeout);
      
      debounceTimeout = setTimeout(() => {
        promptUser();
      }, 3000);
    }
  });
  
  console.log('\x1b[32m[OK] Aguardando modificações nos arquivos de código...\x1b[0m');
} catch (err) {
  console.error('\x1b[31m[ERRO] Não foi possível iniciar o monitor de arquivos:\x1b[0m', err.message);
}
