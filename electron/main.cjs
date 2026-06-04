const path = require("node:path");
const { app, BrowserWindow, ipcMain } = require("electron");
const db = require("./db.cjs");

const isDev = !app.isPackaged && process.env.ELECTRON_RENDERER_URL;

function createWindow() {
  const window = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

ipcMain.handle("clientes:list", (_event, filters) => db.listClientes(filters));
ipcMain.handle("clientes:find", (_event, id) => db.findCliente(id));
ipcMain.handle("clientes:create", (_event, payload) => db.createCliente(payload));
ipcMain.handle("clientes:update", (_event, id, payload) => db.updateCliente(id, payload));
ipcMain.handle("clientes:delete", (_event, id) => db.deleteCliente(id));

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
