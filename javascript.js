const fs = require('fs');
const path = require('path');
const { remote } = require('electron');
const { dialog } = remote;
const fetch = require('node-fetch'); // Certifique-se de instalar o node-fetch: npm install node-fetch

const currentVersion = "1.0.0"; // Versão atual do aplicativo

async function checkForUpdates() {
    const response = await fetch('https://minecraftbedrockpro.github.io/Marketplace-Free/version.json');
    if (response.ok) {
        const data = await response.json();
        if (data.version !== currentVersion) {
            if (confirm('Uma nova versão está disponível. Deseja atualizar agora?')) {
                window.location.href = data.url; // Link para baixar a nova versão
            }
        }
    } else {
        console.error('Erro ao verificar atualizações:', response.statusText);
    }
}

async function downloadFile(url) {
    const filename = url.split('/').pop().split('?')[0]; // Extrai o nome do arquivo da URL
    try {
        const result = await dialog.showSaveDialog({
            defaultPath: path.join(__dirname, filename)
        });

        if (!result.canceled) {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.arrayBuffer();
                fs.writeFileSync(result.filePath, Buffer.from(data));
                alert('Download concluído para ' + filename);
            } else {
                alert('Erro ao baixar o arquivo: ' + response.statusText);
            }
        }
    } catch (err) {
        console.error('Erro ao baixar o arquivo:', err);
    }
}

function showSection(id) {
    // Salva a seção ativa no localStorage
    localStorage.setItem('activeSection', id);

    // Esconde todas as seções
    var sections = document.querySelectorAll('.section');
    sections.forEach(function(section) {
        section.classList.remove('active');
    });

    // Mostra a seção selecionada
    document.getElementById(id).classList.add('active');
}

// Recupera a seção ativa ao carregar a página
window.onload = function() {
    console.log('Página carregada');
    checkForUpdates(); // Verifica se há atualizações ao carregar a página

    const savedSection = localStorage.getItem('activeSection');
    if (savedSection && document.getElementById(savedSection)) {
        showSection(savedSection);
    } else {
        // Mostra a seção principal (default) se nada estiver salvo
        showSection('mapas-world');
    }

    // Adiciona manipulação de atualização
    window.electron.onUpdateAvailable(() => {
        alert('Nova atualização disponível. Baixando agora...');
    });

    window.electron.onUpdateDownloaded(() => {
        alert('Atualização baixada. O aplicativo será reiniciado para aplicar a atualização.');
        // Aqui você pode optar por reiniciar o aplicativo automaticamente
        // autoUpdater.quitAndInstall();
    });

    // Exibir a versão do aplicativo na interface
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
        console.log('Versão do aplicativo encontrada:', window.electron.appVersion);
        versionElement.innerText = `Versão: ${window.electron.appVersion}`;
    } else {
        console.error('Elemento versionElement não encontrado');
    }
};

function search() {
    // Obtém o valor da pesquisa
    var input = document.getElementById('searchInput').value.toLowerCase();
    // Obtém todos os elementos h2
    var h2s = document.querySelectorAll('h2');
    var found = false;

    h2s.forEach(function(h2) {
        // Verifica se o texto do h2 corresponde ao valor da pesquisa
        if (h2.textContent.toLowerCase().includes(input)) {
            // Mostra a seção correspondente
            showSection(h2.closest('.section').id);
            // Destaca o h2 correspondente
            h2.style.backgroundColor = 'yellow';
            found = true;
        } else {
            // Remove o destaque dos h2s que não correspondem
            h2.style.backgroundColor = '';
        }
    });

    if (!found) {
        alert("Nenhum resultado encontrado.");
    }
}

const { BrowserWindow } = require('electron');

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
        },
    });

    win.loadFile('index.html');

    win.on('resize', () => {
        let { width, height } = win.getBounds();
        console.log(`Janela redimensionada para: ${width}x${height}`);
        // Aqui você pode adicionar lógica para ajustar elementos da interface
    });
}
