const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  MenuItem,
  dialog
} = require('electron')
const path = require('path')
const url = require('url')
let win

function createWindow() {

  win = new BrowserWindow({
    minWidth: 480,
    minHeight: 320,
    width: 960,
    height: 640,
    frame: false,
    webPreferences: {
      nodeIntegration: true
    }
  })

  const listPanelMenu = new Menu();

  listPanelMenu.append(new MenuItem({
    label: 'Add music',
    click() {
      dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Images', extensions: ['mp3'] }]
      })
        .then(({ canceled, filePaths }) => {
          if (canceled) {
            return;
          } else if (filePaths.length > 0) {
            win.webContents.send('open-files', filePaths);
          }
        });
    }
  }));
  listPanelMenu.append(new MenuItem({ type: 'separator' }))
  listPanelMenu.append(new MenuItem({
    label: 'Modify music folder',
    click() {
      dialog.showOpenDialog({
        properties: ['openDirectory']
      })
        .then(({ canceled, filePaths }) => {
          if (canceled) {
            return;
          } else if (filePaths.length > 0) {
            const path = filePaths[0].replace(/\\/g, "\/");
            win.webContents.send('modify-music-folder', path + "\/");
          }
        });
    }
  }))

  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  ipcMain.on('window-min', () => {
    win.minimize();
  })

  ipcMain.on('window-max', () => {
    if (win.isMaximized()) {
      win.restore();
    } else {
      win.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    win.close();
  });

  ipcMain.on('list-panel-menu', (e) => {
    listPanelMenu.popup(win);
  })

  // win.webContents.openDevTools()

  win.on('closed', () => {
    win = null
  })
}
app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})


