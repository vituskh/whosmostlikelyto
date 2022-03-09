const {contextBridge, ipcRenderer} = require('electron');
const { startGame } = require('./server');


window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, process.versions[type])
    }
})

contextBridge.exposeInMainWorld('electronAPI', {
    nextQuestion: () => {
        ipcRenderer.send('nextQuestion')
    },
    startGame: () => {
        ipcRenderer.send('startGame')
    },
    setIp: (ip) => {
        ipcRenderer.send('setIp', ip)
    }
})
