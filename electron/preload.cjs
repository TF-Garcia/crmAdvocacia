const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("crmDb", {
  listClientes: (filters) => ipcRenderer.invoke("clientes:list", filters),
  findCliente: (id) => ipcRenderer.invoke("clientes:find", id),
  createCliente: (payload) => ipcRenderer.invoke("clientes:create", payload),
  updateCliente: (id, payload) => ipcRenderer.invoke("clientes:update", id, payload),
  deleteCliente: (id) => ipcRenderer.invoke("clientes:delete", id),
});
