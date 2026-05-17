const { contextBridge, ipcRenderer } = require('electron');

// contextBridge is the only safe channel between the sandboxed renderer and
// the Node main process. These three methods are everything the UI needs:
// - runClaude: invoke Claude CLI and get back structured JSON
// - writeRoute: persist the route for the Übersicht widget
// - onAraTranscript: subscribe to text pushed by Ara over the TCP socket
contextBridge.exposeInMainWorld('electronAPI', {
  runClaude: (prompt) => ipcRenderer.invoke('run-claude', prompt),
  writeRoute: (data) => ipcRenderer.invoke('write-route', data),
  onAraTranscript: (cb) => ipcRenderer.on('ara-transcript', (_, text) => cb(text))
});
