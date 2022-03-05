const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');

const { fork } = require('child_process');
const forked = fork(path.join(__dirname, 'server.js'));

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        },
    });

    ipcMain.on('nextQuestion', (event) => {
        forked.send('nextQuestion');
    })
    ipcMain.on('startGame', (event) => {
        forked.send('startGame');
    })
    

    win.loadFile(path.join(__dirname, 'index.html'));
};

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    });
});

//Disable navigation

app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    event.preventDefault()
  })
})