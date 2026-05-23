const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Caminhos comuns de instalação do Git no Windows
const commonGitPaths = [
  'git', // Tenta usar o comando direto se estiver no PATH
  'C:\\Program Files\\Git\\bin\\git.exe',
  'C:\\Program Files\\Git\\cmd\\git.exe',
  'C:\\Program Files (x86)\\Git\\bin\\git.exe',
  'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
  path.join(process.env.USERPROFILE || '', 'AppData\\Local\\Programs\\Git\\bin\\git.exe'),
  path.join(process.env.USERPROFILE || '', 'AppData\\Local\\Programs\\Git\\cmd\\git.exe')
];

function findGit() {
  for (const gitPath of commonGitPaths) {
    try {
      // Testar se o executável responde
      execSync(`"${gitPath}" --version`, { stdio: 'ignore' });
      return gitPath;
    } catch (e) {
      // Ignorar e testar o próximo
    }
  }
  return null;
}

function runGitCommand(gitPath, args, cwd) {
  const cmd = `"${gitPath}" ${args}`;
  console.log(`\x1b[36mExecutando:\x1b[0m ${cmd}`);
  try {
    const stdout = execSync(cmd, { cwd, encoding: 'utf8', stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`\x1b[31mErro ao executar o comando:\x1b[0m ${cmd}`);
    return false;
  }
}

function ensureGitIdentity(gitPath, cwd) {
  try {
    // Tenta obter o email configurado (seja global ou local)
    execSync(`"${gitPath}" config user.email`, { cwd, stdio: 'ignore' });
    execSync(`"${gitPath}" config user.name`, { cwd, stdio: 'ignore' });
    return true;
  } catch (e) {
    console.log('\n\x1b[33m[AVISO] Identidade do Git não configurada no sistema. Definindo credenciais locais temporárias...\x1b[0m');
    try {
      execSync(`"${gitPath}" config user.email "vemlimpeza@gmail.com"`, { cwd, stdio: 'ignore' });
      execSync(`"${gitPath}" config user.name "Administrador Vem Limpeza"`, { cwd, stdio: 'ignore' });
      console.log('\x1b[32mIdentidade local configurada com sucesso para este repositório!\x1b[0m\n');
      return true;
    } catch (configError) {
      console.error('\x1b[31mFalha ao configurar identidade local do Git:\x1b[0m', configError.message);
      return false;
    }
  }
}

function main() {
  console.log('\x1b[35m=== Assistente de Commit e Push do Vem Limpeza ===\x1b[0m\n');

  // Encontrar o executável do Git
  const gitPath = findGit();
  if (!gitPath) {
    console.error('\x1b[31m[ERRO] O Git não foi encontrado na sua máquina!\x1b[0m');
    console.log('\x1b[33mPor favor, siga um dos passos abaixo para resolver:\x1b[0m');
    console.log('1. Instale o Git para Windows baixando em: https://git-scm.com/download/win');
    console.log('2. Se já tiver instalado, certifique-se de marcar a opção "Add to PATH" durante a instalação.');
    console.log('3. Reinicie seu terminal ou VS Code após a instalação para carregar as novas variáveis de ambiente.');
    process.exit(1);
  }

  console.log(`\x1b[32mGit encontrado em:\x1b[0m ${gitPath}\n`);

  // O diretório raiz do projeto (onde está a pasta .git) é o pai de 'vemlimpeza-app' ou a própria 'vemlimpeza-app'
  // Vamos verificar onde está a pasta .git
  const currentDir = __dirname;
  const parentDir = path.dirname(currentDir);
  let gitRepoDir = currentDir;

  if (fs.existsSync(path.join(parentDir, '.git'))) {
    gitRepoDir = parentDir;
  } else if (!fs.existsSync(path.join(currentDir, '.git'))) {
    // Se não houver .git em nenhum, vamos iniciar no diretório raiz do projeto
    console.log('\x1b[33m[AVISO] Pasta .git não encontrada. Inicializando repositório Git...\x1b[0m');
    gitRepoDir = parentDir; // Inicializa na raiz d:\Projeto 2 MasterClasse
    if (!runGitCommand(gitPath, 'init', gitRepoDir)) {
      process.exit(1);
    }
  }

  console.log(`\x1b[34mDiretório do repositório Git:\x1b[0m ${gitRepoDir}\n`);

  // Garantir identidade do autor do Git (evita erro 'Author identity unknown')
  ensureGitIdentity(gitPath, gitRepoDir);

  // 1. Git Add
  console.log('\x1b[33mAdicionando arquivos modificados...\x1b[0m');
  if (!runGitCommand(gitPath, 'add .', gitRepoDir)) {
    console.error('\x1b[31mFalha ao adicionar arquivos.\x1b[0m');
    process.exit(1);
  }

  // 2. Git Commit
  // Mensagem descritiva e organizada sobre a implementação da Landing Page cinematográfica do Vem Limpeza
  const commitMessage = 'feat: implementa landing page Vem Limpeza e painel de controle de orcamentos';
  console.log(`\n\x1b[33mCriando commit:\x1b[0m "${commitMessage}"`);
  
  // Executar commit (usando aspas duplas no Windows)
  if (!runGitCommand(gitPath, `commit -m "${commitMessage}"`, gitRepoDir)) {
    console.log('\x1b[33mNenhuma alteração pendente para commit ou erro no commit.\x1b[0m');
  }

  // Garantir que a branch atual seja 'main' (evita erro se inicializada como 'master')
  runGitCommand(gitPath, 'branch -M main', gitRepoDir);

  // 3. Verificar branch atual e fazer push
  console.log('\n\x1b[33mEnviando alterações para o repositório remoto...\x1b[0m');
  
  // Tentar fazer push para main
  const pushSuccess = runGitCommand(gitPath, 'push origin main', gitRepoDir);
  
  if (pushSuccess) {
    console.log('\n\x1b[32m[SUCESSO] Código enviado para o GitHub com sucesso!\x1b[0m');
  } else {
    console.log('\n\x1b[33m[DICA] Se o push falhou devido a falta de repositório remoto ou credenciais:\x1b[0m');
    console.log('1. Verifique se o repositório remoto está configurado rodando: git remote -v');
    console.log('2. Se não estiver configurado, configure com:');
    console.log('   git remote add origin URL_DO_SEU_REPOSITORIO_GITHUB');
    console.log('3. Depois, tente fazer o push manualmente usando seu terminal.');
  }
}

main();
