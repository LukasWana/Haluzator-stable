import { app, BrowserWindow, ipcMain, dialog, screen } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let projectionWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const iconPath = isDev
    ? path.join(__dirname, '..', 'assets', 'icon.png')
    : path.join(app.getAppPath(), 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
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
    let fullPath: string = '';

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

// IPC handler for saving files in Electron
ipcMain.handle('save-file', async (event, data: string, defaultFileName: string) => {
  try {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (!senderWindow) {
      return { success: false, error: 'Window not found' };
    }

    const result = await dialog.showSaveDialog(senderWindow, {
      defaultPath: defaultFileName,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    writeFileSync(result.filePath, data, 'utf-8');

    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error('Failed to save file:', error);
    return { success: false, error: (error as Error).message };
  }
});

// Hook into window.open to customize projection windows
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url, frameName, features }) => {
    // Check if this is a projection window (opened with _blank)
    if (frameName === '_blank' || url === 'about:blank') {
      // Create projection window with fullscreen and no frame
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;

      projectionWindow = new BrowserWindow({
        width: width,
        height: height,
        fullscreen: true,
        frame: false,
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true,
        },
        show: false,
      });

      projectionWindow.once('ready-to-show', () => {
        projectionWindow?.show();
        projectionWindow?.setFullScreen(true);
      });

      projectionWindow.on('closed', () => {
        projectionWindow = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('projection-window-closed');
        }
      });

      // Load blank page - content will be injected by renderer
      projectionWindow.loadURL('about:blank');

      return { action: 'allow', overrideBrowserWindowOptions: {} };
    }

    return { action: 'allow' };
  });
});

// IPC handler to configure projection window after content is loaded
ipcMain.handle('configure-projection-window', async (event) => {
  try {
    // Find the most recently created window (should be projection window)
    const allWindows = BrowserWindow.getAllWindows();
    const newWindow = allWindows.find(w => w !== mainWindow && w !== projectionWindow);

    if (newWindow && !newWindow.isDestroyed()) {
      projectionWindow = newWindow;
      newWindow.setFullScreen(true);
      newWindow.setMenuBarVisibility(false);
      newWindow.setAutoHideMenuBar(true);
      return { success: true };
    }
    return { success: false, error: 'Projection window not found' };
  } catch (error) {
    console.error('Failed to configure projection window:', error);
    return { success: false, error: (error as Error).message };
  }
});

