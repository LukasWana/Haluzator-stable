import { app, BrowserWindow, ipcMain, dialog, screen } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let projectionWindow: BrowserWindow | null = null;

// Ensure WebMIDI is available in Electron renderer processes.
app.commandLine.appendSwitch('enable-blink-features', 'WebMIDI,WebMIDIPortDiscovery');

const createWindow = () => {
  // Create the browser window
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  const iconPath = isDev
    ? path.join(__dirname, '..', 'assets', 'icon.png')
    : path.join(app.getAppPath(), 'assets', 'icon.png');

  const createdWindow = new BrowserWindow({
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
  mainWindow = createdWindow;

  // Allow required runtime permissions from the renderer.
  createdWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'midi' || permission === 'midiSysex' || permission === 'media') {
      callback(true);
      return;
    }
    callback(false);
  });

  // Load the app
  if (isDev && devServerUrl) {
    createdWindow.loadURL(devServerUrl);
    createdWindow.webContents.openDevTools();
  } else {
    // In production, files are packaged
    // __dirname points to dist-electron/ in packaged app
    // dist/ folder is at the same level as dist-electron/
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

    // Load the file - loadFile handles asar archives automatically
    createdWindow.loadFile(indexPath).catch((error) => {
      console.error('Failed to load index.html:', error);
      console.error('Error details:', error.message, error.code);

      // Fallback: try using app.getAppPath()
      const appPath = app.getAppPath();
      const altPath = path.join(appPath, 'dist', 'index.html');
      console.log('Trying alternative path:', altPath);

      createdWindow.loadFile(altPath).catch((altError) => {
        console.error('Alternative path also failed:', altError);
      });
    });
  }

  // Show window when ready
  createdWindow.once('ready-to-show', () => {
    createdWindow.show();
  });

  // Handle loading errors (only log, don't open DevTools in production)
  createdWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
    // DevTools not opened in production - errors are logged to console only
  });

  // Handle window closed
  createdWindow.on('closed', () => {
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
  // Only handle window.open from main window
  if (contents !== mainWindow?.webContents) return;

  contents.setWindowOpenHandler(({ url, frameName, features }) => {
    // Check if this is a projection window (opened with _blank)
    if (frameName === '_blank' || url === 'about:blank' || url === '') {
      // If projection window already exists, reuse it
      if (projectionWindow && !projectionWindow.isDestroyed()) {
        projectionWindow.focus();
        // Deny creating a new window, use existing one
        return { action: 'deny' };
      }

      // Create projection window with fullscreen and no frame
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;

      const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
      const projectionHtmlPath = isDev
        ? path.join(__dirname, '..', 'electron', 'projection.html')
        : path.join(__dirname, 'projection.html');

      projectionWindow = new BrowserWindow({
        width: width,
        height: height,
        fullscreen: true,
        frame: false,
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false, // Allow cross-origin for DOM manipulation
          preload: path.join(__dirname, 'preload.js'),
        },
        show: false,
      });

      // Schovat menu PŘED zobrazením okna - kritické pro Windows
      projectionWindow.setMenuBarVisibility(false);
      projectionWindow.setMenu(null);

      projectionWindow.once('ready-to-show', () => {
        // Znovu zajistit skrytí menu před zobrazením
        projectionWindow?.setMenuBarVisibility(false);
        projectionWindow?.setMenu(null);
        projectionWindow?.show();
        projectionWindow?.setFullScreen(true);
        // Znovu po zobrazení
        projectionWindow?.setMenuBarVisibility(false);
        projectionWindow?.setMenu(null);
      });

      // Also hide menu after window is shown
      projectionWindow.webContents.once('did-finish-load', () => {
        projectionWindow?.setMenuBarVisibility(false);
        projectionWindow?.setMenu(null);
      });

      // Hide menu bar when entering/exiting fullscreen (F11)
      projectionWindow.on('enter-full-screen', () => {
        projectionWindow?.setMenuBarVisibility(false);
        projectionWindow?.setMenu(null);
      });

      projectionWindow.on('leave-full-screen', () => {
        projectionWindow?.setMenuBarVisibility(false);
        projectionWindow?.setMenu(null);
      });

      // Hide menu bar when window gains focus
      projectionWindow.on('focus', () => {
        projectionWindow?.setMenuBarVisibility(false);
        projectionWindow?.setMenu(null);
      });

      // Hide menu bar when window is shown (dodatečná ochrana)
      projectionWindow.on('show', () => {
        projectionWindow?.setMenuBarVisibility(false);
        projectionWindow?.setMenu(null);
      });

      // Hide menu bar when window loses focus (prevent menu from appearing)
      projectionWindow.on('blur', () => {
        projectionWindow?.setMenuBarVisibility(false);
        projectionWindow?.setMenu(null);
      });

      // Hide menu bar when window is maximized/unmaximized
      projectionWindow.on('maximize', () => {
        projectionWindow?.setMenuBarVisibility(false);
        projectionWindow?.setMenu(null);
      });

      projectionWindow.on('unmaximize', () => {
        projectionWindow?.setMenuBarVisibility(false);
        projectionWindow?.setMenu(null);
      });

      // Block F11 key in projection window to prevent menu from showing
      projectionWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F11') {
          event.preventDefault();
          // Toggle fullscreen manually without showing menu
          if (projectionWindow) {
            const isFullScreen = projectionWindow.isFullScreen();
            projectionWindow.setFullScreen(!isFullScreen);
            projectionWindow.setMenuBarVisibility(false);
            projectionWindow.setMenu(null);
          }
        }
      });

      projectionWindow.on('closed', () => {
        projectionWindow = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('projection-window-closed');
        }
      });

      // Load projection.html with minimal content - DOM elements will be moved here
      projectionWindow.loadFile(projectionHtmlPath).catch((error) => {
        console.error('Failed to load projection.html:', error);
        // Fallback to about:blank
        projectionWindow?.loadURL('about:blank');
      });

      // Allow window.open to proceed - it will return a reference to our projection window
      // We need to ensure window.open() gets the reference to our custom window
      // By returning 'allow', Electron will use our custom window instead of creating a new one
      return { action: 'allow' };
    }

    return { action: 'allow' };
  });
});

// IPC handler to create projection window
ipcMain.handle('create-projection-window', async () => {
  try {
    // Close existing projection window if any
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.close();
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    const projectionHtmlPath = isDev
      ? path.join(__dirname, '..', 'electron', 'projection.html')
      : path.join(__dirname, 'projection.html');

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
        preload: path.join(__dirname, 'preload.js'),
      },
      show: false,
    });

    // Schovat menu PŘED zobrazením okna - kritické pro Windows
    projectionWindow.setMenuBarVisibility(false);
    projectionWindow.setMenu(null);

    projectionWindow.once('ready-to-show', () => {
      // Znovu zajistit skrytí menu před zobrazením
      projectionWindow?.setMenuBarVisibility(false);
      projectionWindow?.setMenu(null);
      projectionWindow?.show();
      projectionWindow?.setFullScreen(true);
      // Znovu po zobrazení
      projectionWindow?.setMenuBarVisibility(false);
      projectionWindow?.setMenu(null);
    });

    // Also hide menu after window is shown
    projectionWindow.webContents.once('did-finish-load', () => {
      projectionWindow?.setMenuBarVisibility(false);
      projectionWindow?.setMenu(null);
    });

    // Hide menu bar when entering/exiting fullscreen (F11)
    projectionWindow.on('enter-full-screen', () => {
      projectionWindow?.setMenuBarVisibility(false);
      projectionWindow?.setMenu(null);
    });

    projectionWindow.on('leave-full-screen', () => {
      projectionWindow?.setMenuBarVisibility(false);
      projectionWindow?.setMenu(null);
    });

    // Hide menu bar when window gains focus
    projectionWindow.on('focus', () => {
      projectionWindow?.setMenuBarVisibility(false);
      projectionWindow?.setMenu(null);
    });

    // Hide menu bar when window is shown (dodatečná ochrana)
    projectionWindow.on('show', () => {
      projectionWindow?.setMenuBarVisibility(false);
      projectionWindow?.setMenu(null);
    });

    // Hide menu bar when window loses focus (prevent menu from appearing)
    projectionWindow.on('blur', () => {
      projectionWindow?.setMenuBarVisibility(false);
      projectionWindow?.setMenu(null);
    });

    // Hide menu bar when window is maximized/unmaximized
    projectionWindow.on('maximize', () => {
      projectionWindow?.setMenuBarVisibility(false);
      projectionWindow?.setMenu(null);
    });

    projectionWindow.on('unmaximize', () => {
      projectionWindow?.setMenuBarVisibility(false);
      projectionWindow?.setMenu(null);
    });

    // Block F11 key in projection window to prevent menu from showing
    projectionWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F11') {
        event.preventDefault();
        // Toggle fullscreen manually without showing menu
        if (projectionWindow) {
          const isFullScreen = projectionWindow.isFullScreen();
          projectionWindow.setFullScreen(!isFullScreen);
          projectionWindow.setMenuBarVisibility(false);
        }
      }
    });

    projectionWindow.on('closed', () => {
      projectionWindow = null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('projection-window-closed');
      }
    });

    // Load projection.html
    await projectionWindow.loadFile(projectionHtmlPath);

    return { success: true };
  } catch (error) {
    console.error('Failed to create projection window:', error);
    return { success: false, error: (error as Error).message };
  }
});

// IPC handler to get projection window reference
ipcMain.handle('get-projection-window', async () => {
  return {
    success: projectionWindow !== null && !projectionWindow.isDestroyed(),
    exists: projectionWindow !== null && !projectionWindow.isDestroyed()
  };
});

// IPC handler to get projection window webContents ID for reference
ipcMain.handle('get-projection-window-id', async () => {
  try {
    if (!projectionWindow || projectionWindow.isDestroyed()) {
      return { success: false, error: 'Projection window not found' };
    }
    return { success: true, webContentsId: projectionWindow.webContents.id };
  } catch (error) {
    console.error('Failed to get projection window ID:', error);
    return { success: false, error: (error as Error).message };
  }
});

// IPC handler to move DOM elements to projection window
ipcMain.handle('move-elements-to-projection', async (event, canvasId: string, overlayId: string) => {
  try {
    if (!projectionWindow || projectionWindow.isDestroyed()) {
      return { success: false, error: 'Projection window not found' };
    }

    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, error: 'Main window not found' };
    }

    // Wait for projection window to be ready
    await new Promise(resolve => setTimeout(resolve, 300));

    // Prepare projection window structure
    await projectionWindow.webContents.executeJavaScript(`
      (function() {
        let container = document.getElementById('projection-container');
        if (!container) {
          container = document.createElement('div');
          container.id = 'projection-container';
          container.style.cssText = 'width:100%;height:100%;position:relative;margin:0;padding:0;';
          document.body.appendChild(container);
        }

        document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;background-color:black;width:100%;height:100%;';
        document.documentElement.style.cssText = 'margin:0;padding:0;width:100%;height:100%;overflow:hidden;';

        // Ensure canvas and overlay have correct styles when moved
        const canvas = document.getElementById('shader-canvas');
        const overlay = document.getElementById('html-overlay-container');

        if (canvas) {
          canvas.style.cssText = 'width:100% !important;height:100% !important;position:absolute !important;top:0 !important;left:0 !important;margin:0 !important;padding:0 !important;display:block !important;';
        }

        if (overlay) {
          overlay.style.cssText = 'width:100% !important;height:100% !important;position:absolute !important;top:0 !important;left:0 !important;margin:0 !important;padding:0 !important;';
        }

        return { success: true, containerReady: true };
      })();
    `);

    // Get elements and stylesheets from main window
    const mainResult = await mainWindow.webContents.executeJavaScript(`
      (function() {
        const canvas = document.getElementById('${canvasId}');
        const overlay = document.getElementById('${overlayId}');
        if (!canvas || !overlay) return { success: false, error: 'Elements not found' };

        // Get stylesheets
        const stylesheets = [];
        Array.from(document.styleSheets).forEach(styleSheet => {
          try {
            const cssRules = Array.from(styleSheet.cssRules).map(rule => rule.cssText).join(' ');
            if (cssRules) {
              stylesheets.push({ type: 'css', content: cssRules });
            }
          } catch (e) {
            if (styleSheet.href) {
              stylesheets.push({ type: 'link', href: styleSheet.href });
            }
          }
        });

        return {
          success: true,
          stylesheets: stylesheets,
          canvasId: '${canvasId}',
          overlayId: '${overlayId}'
        };
      })();
    `);

    if (!mainResult.success) {
      return mainResult;
    }

    // Inject stylesheets into projection window
    await projectionWindow.webContents.executeJavaScript(`
      (function() {
        const stylesheets = ${JSON.stringify(mainResult.stylesheets)};
        stylesheets.forEach(style => {
          if (style.type === 'css') {
            const styleEl = document.createElement('style');
            styleEl.textContent = style.content;
            document.head.appendChild(styleEl);
          } else if (style.type === 'link') {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = style.href;
            document.head.appendChild(link);
          }
        });
        return { success: true };
      })();
    `);

    // Move actual DOM elements from main window to projection window
    // We'll use executeJavaScript in projection window to access main window
    // via a global variable that we'll set in main window's renderer
    // First, set up the global variable in main window
    await mainWindow.webContents.executeJavaScript(`
      (function() {
        const canvas = document.getElementById('${canvasId}');
        const overlay = document.getElementById('${overlayId}');
        if (!canvas || !overlay) return { success: false, error: 'Elements not found' };

        // Store parent references for cleanup
        window.__projectionCanvasParent = canvas.parentElement;
        window.__projectionOverlayParent = overlay.parentElement;

        // Make main window accessible to projection window
        window.__projectionMainWindow = window;

        return { success: true };
      })();
    `);

    // Move elements using executeJavaScript in main window
    // We'll get the elements and then inject them into projection window
    // Since DOM elements can't be serialized, we need to move them directly
    // We'll use executeJavaScript in projection window to access main window
    // via window.opener (but it's null when handler denies)

    // Alternative: use executeJavaScript in main window to move elements
    // by creating a script in projection window that accesses main window
    // But we can't set cross-window references directly

    // Best solution: use executeJavaScript in projection window
    // to create an iframe that loads main window's URL, then move elements from iframe
    // Or use webContents.executeJavaScript with access to both windows

    // For now, we'll use a simpler approach:
    // Since window.opener is null, we'll need to use a different method
    // Let's try using executeJavaScript in projection window
    // to access main window via a message channel

    // Actually, simplest: change handler to return { action: 'allow' }
    // but ensure only one window is created
    // Or use executeJavaScript in projection window to move elements
    // when they're ready via a signal from main window

    // Wait for projection window to be ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Try to move elements via executeJavaScript in projection window
    // accessing main window's elements
    // Since opener is null, we'll need a workaround
    // For now, signal that projection is ready
    // Elements will be moved by projection.html if opener is available

    // Actually, the best approach is to use executeJavaScript in main window
    // to move elements directly to projection window using webContents
    // But DOM elements can't be serialized, so we need to use a workaround

    // Use executeJavaScript in main window to clone and move elements
    const finalMoveResult = await mainWindow.webContents.executeJavaScript(`
      (function() {
        const canvas = document.getElementById('${canvasId}');
        const overlay = document.getElementById('${overlayId}');
        if (!canvas || !overlay) return { success: false, error: 'Elements not found' };

        // Store references
        window.__projectionCanvas = canvas;
        window.__projectionOverlay = overlay;
        window.__projectionCanvasParent = canvas.parentElement;
        window.__projectionOverlayParent = overlay.parentElement;

        return { success: true, ready: true };
      })();
    `);

    // Signal main window that projection is ready
    mainWindow.webContents.send('projection-ready-for-elements', {
      canvasId: canvasId,
      overlayId: overlayId
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to move elements to projection window:', error);
    return { success: false, error: (error as Error).message };
  }
});

