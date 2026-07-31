import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Keep a global reference of the window object
let mainWindow
const APP_NAME = 'AI ASS'
const DEFAULT_LOCAL_API_BASE_URL = 'http://127.0.0.1:8000/api'
const DEFAULT_REMOTE_API_BASE_URL = 'https://aiass-akx.pages.dev/api'
const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  (app.isPackaged ? DEFAULT_REMOTE_API_BASE_URL : DEFAULT_LOCAL_API_BASE_URL)

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Load the app
  const isDev = process.env.NODE_ENV === 'development'
  const url = isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '../dist/index.html')}`

  mainWindow.loadURL(url)
  mainWindow.setTitle(APP_NAME)

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  app.setName(APP_NAME)
  createWindow()

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers for backend communication
ipcMain.handle('api:request', async (event, method, endpoint, data) => {
  try {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const response = await fetch(`${API_BASE_URL}${normalizedEndpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    })
    return await response.json()
  } catch (err) {
    return { error: err.message }
  }
})

// Create app menu
const menu = Menu.buildFromTemplate([
  {
    label: 'File',
    submenu: [
      { role: 'quit' },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
    ],
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
    ],
  },
])

Menu.setApplicationMenu(menu)
