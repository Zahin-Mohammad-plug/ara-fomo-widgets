const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  runClaude: (prompt) => ipcRenderer.invoke('run-claude', prompt),
  writeRoute: (data) => ipcRenderer.invoke('write-route', data),
  onAraTranscript: (cb) => ipcRenderer.on('ara-transcript', (_, text) => cb(text))
});
