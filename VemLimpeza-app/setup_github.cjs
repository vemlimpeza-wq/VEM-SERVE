const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Caminhos comuns do Git no Windows para localização automática
const commonGitPaths = [
  'git',
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
      execSync(`"${gitPath}" --version`, { stdio: 'ignore' });
      return gitPath;
    } catch (e) {}
  }
  return null;
}

const gitPath = findGit();
if (!gitPath) {
  console.log('\x1b[31m[ERRO] O Git não foi encontrado no sistema.\x1b[0m');
  console.log('Instale o Git por este link: https://git-scm.com/download/win e tente novamente.');
  process.exit(1);
}

// O diretório do repositório é o diretório pai (raiz do projeto)
const currentDir = __dirname;
const parentDir = path.dirname(currentDir);
let gitRepoDir = currentDir;

if (fs.existsSync(path.join(parentDir, '.git'))) {
  gitRepoDir = parentDir;
} else if (fs.existsSync(path.join(currentDir, '.git'))) {
  gitRepoDir = currentDir;
} else {
  // Inicializa caso não exista
  console.log('\x1b[33mInicializando repositório Git...\x1b[0m');
  gitRepoDir = parentDir;
  try {
    execSync(`"${gitPath}" init`, { cwd: gitRepoDir });
  } catch (e) {
    console.error('Falha ao inicializar o Git.', e);
    process.exit(1);
  }
}

console.log('\n\x1b[35m=== Conector GitHub do Vem Limpeza ===\x1b[0m\n');
console.log(`Diretório Git ativo: ${gitRepoDir}`);

rl.question('Cole a URL do seu repositório do GitHub (ex: https://github.com/usuario/nome-do-repo.git):\n> ', (repoUrl) => {
  repoUrl = repoUrl.trim();
  
  if (!repoUrl) {
    console.log('\x1b[31mURL inválida ou vazia. Cancelando...\x1b[0m');
    rl.close();
    process.exit(1);
  }

  try {
    // 1. Configurar credenciais locais de autor se não estiverem definidas
    try {
      execSync(`"${gitPath}" config user.email`, { cwd: gitRepoDir, stdio: 'ignore' });
    } catch (e) {
      console.log('\x1b[33mConfigurando e-mail temporário local...\x1b[0m');
      execSync(`"${gitPath}" config user.email "vemlimpeza@gmail.com"`, { cwd: gitRepoDir });
      execSync(`"${gitPath}" config user.name "Administrador Vem Limpeza"`, { cwd: gitRepoDir });
    }

    // 2. Ajustar Remote Origin
    console.log('\n\x1b[33mRemovendo conexão antiga se houver...\x1b[0m');
    try {
      execSync(`"${gitPath}" remote remove origin`, { cwd: gitRepoDir, stdio: 'ignore' });
    } catch (e) {}

    console.log(`\x1b[33mAdicionando conexão com o repositório: ${repoUrl}...\x1b[0m`);
    execSync(`"${gitPath}" remote add origin "${repoUrl}"`, { cwd: gitRepoDir });

    // 3. Renomear branch para main
    console.log('\x1b[33mRenomeando branch padrão para "main"...\x1b[0m');
    execSync(`"${gitPath}" branch -M main`, { cwd: gitRepoDir });

    // 4. Adicionar arquivos modificados
    console.log('\x1b[33mAdicionando arquivos modificados...\x1b[0m');
    execSync(`"${gitPath}" add .`, { cwd: gitRepoDir });

    // 5. Criar commit
    const commitMessage = 'feat: atualiza landing page e painel resiliente do Vem Limpeza';
    console.log(`\x1b[33mCriando commit:\x1b[0m "${commitMessage}"`);
    try {
      execSync(`"${gitPath}" commit -m "${commitMessage}"`, { cwd: gitRepoDir });
    } catch (e) {
      console.log('\x1b[33mSem alterações pendentes para comitar.\x1b[0m');
    }

    // 6. Push com force/upstream
    console.log('\n\x1b[33mFazendo upload (git push) para o GitHub (isso pode exigir login)...\x1b[0m');
    console.log('\x1b[36mSe uma janela do GitHub abrir no seu navegador, faça o login nela.\x1b[0m\n');
    
    execSync(`"${gitPath}" push -u origin main --force`, { cwd: gitRepoDir, stdio: 'inherit' });

    console.log('\n\x1b[32m[SUCESSO] Repositório conectado e sincronizado com o GitHub com sucesso!\x1b[0m');
  } catch (error) {
    console.error('\n\x1b[31m[ERRO] Falha durante a execução do processo:\x1b[0m', error.message);
    console.log('\n\x1b[33mVerifique se a URL do repositório está correta e se você tem acesso a ele.\x1b[0m');
  } finally {
    rl.close();
  }
});
