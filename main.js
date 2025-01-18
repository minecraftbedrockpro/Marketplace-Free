const path = require('path');
const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
require('electron-reload')(path.join(__dirname, 'seu-site'), {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
});

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, 'icons/app-icon.png'), // Caminho para a imagem do ícone
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // Opcional, se necessário
            nodeIntegration: true,
            enableRemoteModule: true, // Habilita o módulo remoto
            contextIsolation: false // Para permitir a integração com o Node.js
        },
    });

    win.loadFile(path.join(__dirname, 'seu-site/index.html')); // Caminho atualizado para 'seu-site'

    // Verifica por atualizações e notifica o usuário
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {
        win.webContents.send('update_available');
    });

    autoUpdater.on('update-downloaded', () => {
        win.webContents.send('update_downloaded');
    });
}

// Exibir a versão do aplicativo no console
console.log(`Versão do aplicativo: ${app.getVersion()}`);

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
