const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function main() {
  console.log('\x1b[35m=== Diagnosticador de Build & Execução do Vem Limpeza ===\x1b[0m\n');

  const appDir = __dirname;
  console.log(`Diretório do App: ${appDir}`);

  // 1. Verificar node_modules
  const nodeModulesPath = path.join(appDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.error('\x1b[31m[ERRO] A pasta node_modules não existe!\x1b[0m');
    console.log('\x1b[33mPor favor, execute "npm install" na pasta vemlimpeza-app antes de rodar o app.\x1b[0m');
    process.exit(1);
  }
  console.log('\x1b[32m[OK] Pasta node_modules encontrada.\x1b[0m');

  // 2. Tentar simular uma build de teste (Production Build) para expor erros de compilação
  console.log('\n\x1b[33mExecutando uma build de teste (vite build) para verificar erros de sintaxe ou importação...\x1b[0m');
  
  try {
    const buildOutput = execSync('npx vite build', { 
      cwd: appDir, 
      encoding: 'utf8', 
      stdio: 'pipe' 
    });
    console.log('\x1b[32m[SUCESSO] A build de teste foi concluída com sucesso! Não há erros de sintaxe ou imports quebrados.\x1b[0m');
    console.log('\n\x1b[33mPara abrir o app em modo de desenvolvimento, execute:\x1b[0m');
    console.log('\x1b[36mnpm run dev\x1b[0m (dentro da pasta vemlimpeza-app)');
  } catch (error) {
    console.error('\n\x1b[31m[ERRO DE COMPILAÇÃO DETECTADO]\x1b[0m');
    console.error('\x1b[33mA build do Vite falhou com o seguinte erro:\x1b[0m\n');
    console.error(error.stderr || error.message);
    
    console.log('\n\x1b[35mDicas de Correção:\x1b[0m');
    if (error.message.includes('Cannot find module')) {
      console.log('- Uma dependência importada não está instalada no package.json. Rode "npm install".');
    } else {
      console.log('- Verifique os caminhos das imagens e arquivos JSX importados no App.jsx.');
    }
  }
}

main();
