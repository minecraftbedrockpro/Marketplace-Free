const { contextBridge, ipcRenderer } = require('electron');
const { require: remoteRequire } = require('@electron/remote');
const { app } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector);
        if (element) element.innerText = text;
    };

    for (const dependency of ['chrome', 'node', 'electron']) {
        replaceText(`${dependency}-version`, process.versions[dependency]);
    }
});

contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: ipcRenderer,
    remote: remoteRequire,
    appVersion: app.getVersion(), // Adicionando a versão do aplicativo
    onUpdateAvailable: (callback) => ipcRenderer.on('update_available', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update_downloaded', callback)
});
