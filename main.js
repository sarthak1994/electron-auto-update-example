const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron');
const { autoUpdater } = require('electron-updater');
const {ProgId, ShellOption, Regedit} = require('electron-regedit')
const path = require('path')
const os = require ('os');

let mainWindow;
let tray = null;
let isQuiting;
autoUpdater.autoInstallOnAppQuit  = true;
// new ProgId({
//     description: 'My App File',
//     icon: 'myicon.ico',
//     extensions: ['myapp'],
//     shell: [
//         new ShellOption({verb: ShellOption.OPEN}),
//         new ShellOption({verb: ShellOption.EDIT, args: ['--edit']}),
//         new ShellOption({verb: ShellOption.PRINT, args: ['--print']})
//     ]
// })


function createWindow () {
  makeSingleInstance()
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
    show:true
  });
  mainWindow.loadFile('index.html');
  mainWindow.on('close', function(event) {
    if (!isQuiting) {
        mainWindow.hide();
        event.preventDefault();
        event.returnValue = false;
    }
    return false;
});
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
  mainWindow.once('ready-to-show', () => {
    //autoUpdater.checkForUpdatesAndNotify();
  });
}

  
app.on('ready', () => {
    createWindow();
    setTimeout(function(){
      autoUpdater.checkForUpdatesAndNotify();
    },1000)
 
  tray = new Tray(path.join(__dirname, '/assets/app-icon/png/1024x1024.png'))
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Item1', type: 'radio' },
    { label: 'Item2', type: 'radio' },
    { label: 'Item3', type: 'radio', checked: true },
    { label: 'Item4', type: 'radio' },
        {
                label: 'Quit',
                click: function() {
                    isQuiting = true;
                    app.quit();
                }
            }
  ])
  tray.setToolTip('This is my application.')
  tray.setContextMenu(contextMenu);
  tray.on('double-click',function(){
            mainWindow.show();
        })
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});


app.on('quit', function () {
  //app.relaunch();
 //console.log('sas');
});
app.on('before-quit', function() {
    isQuiting = true;
});

ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: app.getVersion() });
});

ipcMain.on('username', (event) => {
  var exec = require('child_process').exec; 
  exec('query user', function(err,so,se) {
    let username = '';
    let found = false;
    let arr = so.split('\r\n');
    for(let j in arr){
      if(j > 0){
        let arr2 = arr[j].split(' ');
        for(let k in arr2){
          if(arr2[k].startsWith('>')){
            username = arr2[k].replace('>','');
            found = true;
            break;
          }
        }
        if(found){
          break;
        }
      }
    }
    // if(!found){
    //   username =  os.userInfo ().username;
    // }
    event.sender.send('username', { version: username });
    
  });
});


ipcMain.on('isprivilaged', (event) => {
  var exec = require('child_process').exec; 
  exec('NET SESSION', function(err,so,se) {
    let a = se.length === 0 ? "admin" : "not admin";
    event.sender.send('isprivilaged', { isprivilaged: a });
  });
  
});





autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update_available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update_downloaded');
  autoUpdater.quitAndInstall(true,true);
});

ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall(true,true);
});

ipcMain.on('block_website', (event,args) => {
  var fs = require('fs');
  
  var exec = require('child_process').exec; 
  exec('echo %windir%', function(err,so,se) {

    let a = so.replace('\r\n','');
    console.log(a);
    let filepath = a+'/System32/drivers/etc/hosts';
  
  fs.readFile(filepath, 'utf-8', (err, data) => {
        if(err){
            console.log(err.message);
            return;
        }
         let list = data.split('\r\n');
         list.push('127.0.0.1 '+args.website);
         list.push('127.0.0.1 www.'+args.website);
         console.log(list)
         let txt = list.join('\r\n');

         try { fs.writeFileSync(filepath, txt, 'utf-8'); }
        catch(e) { console.log('Failed to save the file !'); }

        // Change how to handle the file content
    });
  });
    console.log(args);
});



function makeSingleInstance() {
    // if (process.mas) return

    // const gotTheLock = app.requestSingleInstanceLock();
    
    // if(!gotTheLock){
    //     isQuiting = true;
    //     app.quit();
    // }
    // else{
    //     app.on('second-instance', () => {
    //         if (mainWindow) {
    //             if (mainWindow.isMinimized()){
    //                 mainWindow.restore()
    //             }
    //             mainWindow.focus()
    //         }
    //     });
    // }
}
