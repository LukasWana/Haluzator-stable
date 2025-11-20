import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createWindow = () => {
  // Create the browser window
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const iconPath = isDev
    ? path.join(__dirname, '..', 'assets', 'icon.png')
    : path.join(app.getAppPath(), 'assets', 'icon.png');

  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: iconPath,
    show: false,
    autoHideMenuBar: true, // Schová horní systémové menu
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, files are packaged
    // __dirname points to dist-electron/ in packaged app
    // dist/ folder is at the same level as dist-electron/
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

    // Load the file - loadFile handles asar archives automatically
    mainWindow.loadFile(indexPath).catch((error) => {
      console.error('Failed to load index.html:', error);
      console.error('Error details:', error.message, error.code);

      // Fallback: try using app.getAppPath()
      const appPath = app.getAppPath();
      const altPath = path.join(appPath, 'dist', 'index.html');
      console.log('Trying alternative path:', altPath);

      mainWindow.loadFile(altPath).catch((altError) => {
        console.error('Alternative path also failed:', altError);
      });
    });
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle loading errors (only log, don't open DevTools in production)
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
    // DevTools not opened in production - errors are logged to console only
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    // Dereference the window object
  });
};

// This method will be called when Electron has finished initialization
app.on('ready', createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handler for reading files in production
ipcMain.handle('read-file', async (event, filePath: string) => {
  try {
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    let fullPath: string;

    if (isDev) {
      // In dev, use relative path from project root
      fullPath = path.join(__dirname, '..', filePath);
    } else {
      // In production, files are in app.asar or app directory
      const appPath = app.getAppPath();

      // Try multiple paths
      const pathsToTry = [
        path.join(appPath, filePath), // Direct path
        path.join(appPath, 'dist', filePath.replace('dist/', '')), // In dist folder
        path.join(__dirname, '..', filePath), // Relative to dist-electron
      ];

      let found = false;
      for (const tryPath of pathsToTry) {
        try {
          if (existsSync(tryPath)) {
            fullPath = tryPath;
            found = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!found) {
        // Last resort: use app path directly
        fullPath = path.join(appPath, filePath);
      }
    }

    const content = readFileSync(fullPath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    console.error('Failed to read file:', filePath, error);
    return { success: false, error: (error as Error).message };
  }
});

