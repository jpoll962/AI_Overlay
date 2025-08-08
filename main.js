const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Fix GPU acceleration issues on Linux (especially AMD GPUs)
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');

let mainWindow;
let processes = {
  ollama: null,
  llamacpp: null,
  coqui: null
};

function createCustomMenu() {
  const template = [
    {
      label: 'AI Chat',
      submenu: [
        {
          label: 'About AI Chat Overlay',
          click: () => {
            shell.openExternal('https://github.com/jpoll962/AI_Overlay');
          }
        },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'Ctrl+,',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('open-settings');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Chat',
      submenu: [
        {
          label: 'Clear Chat',
          accelerator: 'Ctrl+K',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('clear-chat');
            }
          }
        },
        {
          label: 'Export Chat',
          accelerator: 'Ctrl+E',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('export-chat');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle Always On Top',
          accelerator: 'Ctrl+T',
          click: () => {
            if (mainWindow) {
              const isOnTop = mainWindow.isAlwaysOnTop();
              mainWindow.setAlwaysOnTop(!isOnTop);
            }
          }
        },
        {
          label: 'Minimize to Bar',
          accelerator: 'Ctrl+M',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('toggle-accordion');
            }
          }
        }
      ]
    },
    {
      label: 'Services',
      submenu: [
        {
          label: 'Ollama',
          submenu: [
            {
              label: 'Start Ollama',
              click: () => {
                if (mainWindow) {
                  mainWindow.webContents.send('start-service', 'ollama');
                }
              }
            },
            {
              label: 'Stop Ollama',
              click: () => {
                if (mainWindow) {
                  mainWindow.webContents.send('stop-service', 'ollama');
                }
              }
            }
          ]
        },
        {
          label: 'Llama.cpp',
          submenu: [
            {
              label: 'Start Llama.cpp',
              click: () => {
                if (mainWindow) {
                  mainWindow.webContents.send('start-service', 'llamacpp');
                }
              }
            },
            {
              label: 'Stop Llama.cpp',
              click: () => {
                if (mainWindow) {
                  mainWindow.webContents.send('stop-service', 'llamacpp');
                }
              }
            }
          ]
        },
        {
          label: 'Coqui-TTS',
          submenu: [
            {
              label: 'Start Coqui-TTS',
              click: () => {
                if (mainWindow) {
                  mainWindow.webContents.send('start-service', 'coqui');
                }
              }
            },
            {
              label: 'Stop Coqui-TTS',
              click: () => {
                if (mainWindow) {
                  mainWindow.webContents.send('stop-service', 'coqui');
                }
              }
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Open Claude Web',
          click: () => {
            shell.openExternal('https://claude.ai');
          }
        },
        {
          label: 'Open Grok Web',
          click: () => {
            shell.openExternal('https://grok.com');
          }
        },
        {
          label: 'Open ChatGPT Web',
          click: () => {
            shell.openExternal('https://chat.openai.com');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Ctrl+R',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.reload();
            }
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'Ctrl+Shift+R',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.reloadIgnoringCache();
            }
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Actual Size',
          accelerator: 'Ctrl+0',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.setZoomLevel(0);
            }
          }
        },
        {
          label: 'Zoom In',
          accelerator: 'Ctrl+Plus',
          click: () => {
            if (mainWindow) {
              const currentZoom = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
            }
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'Ctrl+-',
          click: () => {
            if (mainWindow) {
              const currentZoom = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'AI Chat Overlay Documentation',
          click: () => {
            shell.openExternal('https://github.com/jpoll962/AI_Overlay/wiki');
          }
        },
        {
          label: 'Keyboard Shortcuts',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-shortcuts');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Ollama Repository',
          click: () => {
            shell.openExternal('https://github.com/ollama/ollama/tree/main');
          }
        },
        {
          label: 'Llama.cpp Repository',
          click: () => {
            shell.openExternal('https://github.com/ggerganov/llama.cpp');
          }
        },
        {
          label: 'Coqui-TTS Repository',
          click: () => {
            shell.openExternal('https://github.com/idiap/coqui-ai-TTS');
          }
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/jpoll962/AI_Overlay/issues');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 430,
    height: 650,
    x: 50, // Position from left
    y: 50, // Position from top
    frame: true, // Keep frame for easy dragging
    alwaysOnTop: true,
    resizable: true,
    minimizable: true,
    maximizable: false,
    skipTaskbar: false, // Show in taskbar
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      // Force software rendering for compatibility
      offscreen: false,
      hardwareAcceleration: false
    },
    titleBarStyle: 'default',
    title: 'AI Chat Overlay',
    // Allow the window content to handle dragging when frameless
    titleBarOverlay: false
  });

  mainWindow.loadFile('index.html');

  // Keep window on top even when losing focus
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Development tools
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// App event listeners
app.whenReady().then(() => {
  createCustomMenu();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('open-claude', () => {
  shell.openExternal('https://claude.ai');
});

ipcMain.handle('open-grok', () => {
  shell.openExternal('https://grok.com');
});

ipcMain.handle('open-chatgpt', () => {
  shell.openExternal('https://chat.openai.com');
});

ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('toggle-always-on-top', () => {
  if (mainWindow) {
    const isOnTop = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!isOnTop);
    return !isOnTop;
  }
  return false;
});

// Accordion mode handlers
ipcMain.handle('toggle-accordion', (event, isMinimized) => {
  if (mainWindow) {
    if (isMinimized) {
      // Store current window state
      const bounds = mainWindow.getBounds();
      
      // Disable resizing in accordion mode
      mainWindow.setResizable(false);
      
      // Resize to just the header bar (48px height + window frame)
      mainWindow.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: 315, // Compact width
        height: 48  // Just the header height
      });
      
      // Hide the title bar and menu bar
      mainWindow.setMenuBarVisibility(false);
      
    } else {
      // Re-enable resizing
      mainWindow.setResizable(true);
      
      // Restore to full size
      mainWindow.setBounds({
        x: mainWindow.getBounds().x,
        y: mainWindow.getBounds().y,
        width: 430,
        height: 650
      });
      
      // Show the title bar and menu bar again
      mainWindow.setMenuBarVisibility(true);
    }
    
    return true;
  }
  return false;
});

// Windowless mode handlers
ipcMain.handle('toggle-windowless', (event, isWindowless) => {
  if (mainWindow) {
    // Store current bounds
    const bounds = mainWindow.getBounds();
    
    // Close current window
    mainWindow.destroy();
    
    // Create new window with or without frame
    mainWindow = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      frame: !isWindowless, // Toggle frame based on windowless mode
      alwaysOnTop: true,
      resizable: true,
      minimizable: !isWindowless, // Can't minimize windowless
      maximizable: false,
      skipTaskbar: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        offscreen: false,
        hardwareAcceleration: false
      },
      titleBarStyle: isWindowless ? 'hidden' : 'default',
      title: 'AI Chat Overlay',
      titleBarOverlay: false
    });

    // Load the page
    mainWindow.loadFile('index.html');
    
    // Keep window on top
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    
    // If windowless, make the entire header draggable
    if (isWindowless) {
      mainWindow.setMenuBarVisibility(false);
    } else {
      // Recreate the custom menu
      createCustomMenu();
    }

    // Handle window closed
    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    return true;
  }
  return false;
});

// Service management
ipcMain.handle('start-service', async (event, serviceType, config) => {
  return await startService(serviceType, config);
});

ipcMain.handle('stop-service', async (event, serviceType) => {
  return await stopService(serviceType);
});

ipcMain.handle('get-service-status', (event, serviceType) => {
  return processes[serviceType] !== null;
});

// Service management functions
async function startService(serviceType, config) {
  try {
    // Stop existing process if running
    if (processes[serviceType]) {
      await stopService(serviceType);
    }

    let process;
    const cwd = config.workingDirectory || process.cwd();

    switch (serviceType) {
      case 'ollama':
        // Check if ollama is already running system-wide
        const ollamaCheck = await checkServiceRunning('ollama');
        if (ollamaCheck) {
          return { success: true, message: 'Ollama already running system-wide' };
        }
        
        process = spawn('ollama', ['serve'], { 
          cwd: cwd,
          detached: false,
          stdio: 'pipe'
        });
        break;

      case 'llamacpp':
        if (!config.modelPath) {
          return { success: false, error: 'Model path required for Llama.cpp' };
        }
        
        const llamacppArgs = [
          '-m', config.modelPath,
          '--port', config.port || '8080',
          '--host', '0.0.0.0'
        ];
        
        // Add additional args if provided
        if (config.additionalArgs) {
          llamacppArgs.push(...config.additionalArgs.split(' '));
        }
        
        process = spawn('./server', llamacppArgs, { 
          cwd: cwd,
          detached: false,
          stdio: 'pipe'
        });
        break;

      case 'coqui':
        const coquiArgs = [
          '-m', 'TTS.server.server',
          '--host', '0.0.0.0',
          '--port', config.port || '5002'
        ];
        
        if (config.additionalArgs) {
          coquiArgs.push(...config.additionalArgs.split(' '));
        }
        
        process = spawn('python', coquiArgs, { 
          cwd: cwd,
          detached: false,
          stdio: 'pipe'
        });
        break;

      default:
        return { success: false, error: 'Unknown service type' };
    }

    processes[serviceType] = process;

    // Handle process events
    process.on('error', (error) => {
      console.error(`${serviceType} process error:`, error);
      processes[serviceType] = null;
    });

    process.on('exit', (code) => {
      console.log(`${serviceType} process exited with code ${code}`);
      processes[serviceType] = null;
    });

    // Give the process a moment to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    return { success: true, message: `${serviceType} started successfully` };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function stopService(serviceType) {
  try {
    if (processes[serviceType]) {
      processes[serviceType].kill('SIGTERM');
      processes[serviceType] = null;
      return { success: true, message: `${serviceType} stopped` };
    }
    return { success: true, message: `${serviceType} was not running` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function checkServiceRunning(serviceName) {
  return new Promise((resolve) => {
    exec(`pgrep -x ${serviceName}`, (error, stdout) => {
      resolve(stdout.trim() !== '');
    });
  });
}

// Clean up processes on app quit
app.on('before-quit', () => {
  Object.keys(processes).forEach(serviceType => {
    if (processes[serviceType]) {
      processes[serviceType].kill('SIGTERM');
    }
  });
});