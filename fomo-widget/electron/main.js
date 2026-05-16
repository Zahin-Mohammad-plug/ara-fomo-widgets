const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const net = require('net');
const { runClaudeCode, writeRoute } = require('./ipc');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('run-claude', async (_, prompt) => {
    return runClaudeCode(prompt);
  });

  ipcMain.handle('write-route', async (_, data) => {
    return writeRoute(data);
  });

  // Ara sends transcripts via local socket on port 9876
  const server = net.createServer(socket => {
    socket.on('data', data => {
      const text = data.toString().trim();
      if (text && mainWindow) {
        mainWindow.webContents.send('ara-transcript', text);
      }
    });
    socket.on('error', () => {});
  });

  server.listen(9876, '127.0.0.1', () => {
    console.log('Ara IPC socket listening on 127.0.0.1:9876');
  });

  server.on('error', (err) => {
    console.warn('Ara socket error (non-fatal):', err.message);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
