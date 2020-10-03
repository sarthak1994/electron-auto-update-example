const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron');
const { autoUpdater,dialog  } = require('electron-updater');
const {ProgId, ShellOption, Regedit} = require('electron-regedit')
const path = require('path')
const os = require ('os');
const fs = require('fs');
const url = require('url')
const util = require('util');
const electronLocalshortcut = require('electron-localshortcut');
const http = require('http');
const https = require('https');
var Cipher = require('aes-ecb');
let user_data_glb = {
	"logged_in_path":"",
	"blocked_websites":[],
};
let socket;

// const requestHandler = (req, res) => { // discard all request to proxy server except HTTP/1.1 CONNECT method
// 	console.log('req',req.url);
//   // res.writeHead(405, {'Content-Type': 'text/plain'})
//   // res.end('Method not allowed')
// }
var proxy_port = 9191;//process.env.PORT || 9191
var watchFilestime = [];
var server = http.createServer()
const net = require('net')
const httpProxy = require('http-proxy');
var openwindows = {};
let isprivilaged = false;

let mainWindow;
let tray = null;
let isQuiting;

//let path_to_host = app.getAppPath()+'/../../ob/host';
let path_to_host = app.getAppPath()+'/../../../host';
autoUpdater.autoInstallOnAppQuit  = true;


function createWindow () {
  makeSingleInstance()
  let is_debug = {"show_window":false};
	try{
		is_debug = JSON.parse(fs.readFileSync(app.getAppPath()+'/../../log/is_debug.json'));
	}
	catch(e){
		is_debug = {"show_window":false};
	}
	
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
    show:is_debug['show_window'],
    skipTaskbar:!is_debug['show_window'],
  });
  	if (process.platform === 'linux') {
        windowOptions.icon = path.join(__dirname, '/assets/app-icon/png/1024x1024.png');
    }
  mainWindow.loadFile('index.html');
  mainWindow.on('close', function(event) {
    // if (!isQuiting) {
    //     mainWindow.hide();
    //     event.preventDefault();
    //     event.returnValue = false;
    // }
    // return false;
  });
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
  mainWindow.once('ready-to-show', () => {
    //autoUpdater.checkForUpdatesAndNotify();
  });
}

  
app.on('ready', async() => {
	console.log('process',process.argv)

	if(/--open--/.test(process.argv[1])){
		var url = process.argv[1].split('--');
		var data = {
			type:'fromtool',
			url:url[2],
		};
		startShare(data);
	}
	else{
	
		isprivilaged = await getPrivilaged();

		if(!isprivilaged){
			startregular();
		}
		else{
			startAdminPrivilage();
		}
		let user_admin = await userIsAdmin();
		if(user_admin && !isprivilaged){
			// setTimeout(function(){
			// 	autoUpdater.checkForUpdatesAndNotify();
			// },1000);

			// setInterval(function(){
			// 	autoUpdater.checkForUpdatesAndNotify();
			// },40000);
		}
	}


	
  
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

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
});

ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: app.getVersion() });
});

ipcMain.on('username', async (event) => {
  let username = await getUsername();
  event.sender.send('username', { version: username });
});


async function userIsAdmin(){
	return new Promise(async(resolve,reject) => {
	    try{
	    	let username = await getUsername();
	    	var exec = require('child_process').exec; 
	    	exec('net user '+username, function(err,so,se) {
	    		let arr = so.split('\r\n');
	    		for(let j in arr){
	    			if(arr[j].startsWith('Local Group Memberships')){
	    				let a = arr[j].replace('Local Group Memberships','').trim();
	    				if(a == '*Administrators'){
	    					return resolve(true);
	    				}
	    				break;
	    			}
	    		}
	    		return resolve(false);
	    	});
	    }
	    catch(e){
	    	return resolve(false);
	    }
	});
}

function getUsername(){
  return new Promise(async(resolve,reject) => {
    try{
        var exec = require('child_process').exec; 
        exec('query user', function(err,so,se) {
          let username = '';
          let found = false;
          let arr = so.split('\r\n');
          for(let j in arr){
            if(j > 0){
              let arr2 = arr[j].split('  ');
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
          if(!found){
            username = os.userInfo().username;
          }
          resolve(username);
        });
      }
      catch(e){
        resolve('');
      }
  })
}


ipcMain.on('isprivilaged', async (event) => {
  let isprivilaged = await getPrivilaged();
  let a = isprivilaged ? "admin" : "not admin";
  event.sender.send('isprivilaged', { isprivilaged: a });
});

function getPrivilaged(){
  return new Promise(async(resolve,reject) => {
    try{
      var exec = require('child_process').exec; 
      exec('NET SESSION', async function(err,so,se) {
        let a = se.length === 0 ? true : false;
        resolve(a); 
      });
    }
    catch(e){
      resolve(false);
    }
  })
}


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
  
 
});

function block_website(args){
	
  
  var exec = require('child_process').exec; 

  
  exec('echo %windir%', function(err,so,se) {

    let a = so.replace('\r\n','');

    let filepath = a+'/System32/drivers/etc/hosts';
  
  fs.readFile(filepath, 'utf-8', (err, data) => {
        if(err){
            console.log(err.message);
            return;
        }
         let list = data.split('\r\n');
         list.push('127.0.0.1 '+args.website);
         list.push('127.0.0.1 www.'+args.website);
         
         let txt = list.join('\r\n');

         try { fs.writeFileSync(filepath, txt, 'utf-8'); }
        catch(e) { console.log('Failed to save the file !'); }

        // Change how to handle the file content
    });
  });
}


function get_win_dir(){
  return new Promise(async(resolve,reject) => {
    try{
      var exec = require('child_process').exec; 
      exec('echo %windir%', async function(err,so,se) {
        let a = so.replace('\r\n','');
        resolve(a); 
      });
    }
    catch(e){
      resolve(false);
    }
  })
}

function get_host_dir(){
	return new Promise(async(resolve,reject) => {
	    try{
			let windir = await get_win_dir();
			let host_dir = windir +'/System32/drivers/etc/hosts';
			resolve(host_dir);
	    }
	    catch(e){
	      resolve(false);
	    }
	})
}

function log_data(datas){
	
  
  var exec = require('child_process').exec; 
  exec('echo %windir%', function(err,so,se) {

    let a = so.replace('\r\n','');
    let filepath = a+'/System32/drivers/etc/hosts';
  
  fs.readFile(filepath, 'utf-8', (err, data) => {
        if(err){
            console.log(err.message);
            return;
        }
         let list = data.split('\r\n');
         list.push('log_data '+JSON.stringify(datas));
       
         let txt = list.join('\r\n');

         try { fs.writeFileSync(filepath, txt, 'utf-8'); }
        catch(e) { console.log('Failed to save the file !'); }

        // Change how to handle the file content
    });
  });
}

function makeSingleInstance() {
  
      if (process.mas) return

      const gotTheLock = app.requestSingleInstanceLock();
      
      if(!gotTheLock){
          isQuiting = true;
          app.quit();
      }
      else{
          app.on('second-instance', () => {
              if (mainWindow) {
                  if (mainWindow.isMinimized()){
                      mainWindow.restore()
                  }
                  mainWindow.focus()
              }
          });
      }
}

function startregular(){
	createWindow();
	create_tray();
	watchFiles();
	registerShortCut(mainWindow); 
}

function registerShortCut(win){
	electronLocalshortcut.register(win, 'Control+Shift+Alt+C', () => {
        win.webContents.openDevTools();
	    return;
    });
}

function create_tray(){
	var template = [];
	const menu = Menu.buildFromTemplate(template);
 	Menu.setApplicationMenu(menu);

	// tray = new Tray(path.join(__dirname, '/assets/app-icon/png/1024x1024.png'))
	//   const contextMenu = Menu.buildFromTemplate([
	//     { label: 'Item1', type: 'radio' },
	//     { label: 'Item2', type: 'radio' },
	//     { label: 'Item3', type: 'radio', checked: true },
	//     { label: 'Item4', type: 'radio' },
	//         {
	//                 label: 'Quit',
	//                 click: function() {
	//                     isQuiting = true;
	//                     app.quit();
	//                 }
	//             }
	//   ])
	// tray.setToolTip('This is my application.')
	// tray.setContextMenu(contextMenu);
	// tray.on('double-click',function(){
	// 	mainWindow.show();
	// })
}

function startAdminPrivilage(){
	startProxyServer();	
	watchFiles();
}

async function enableProxyServer(enable=1){
	return;
	let username = await getUsername()
	var exec = require('child_process').exec; 
	exec("wmic useraccount where name='"+username+"' get sid",function(err,so,se){
		
		let arr = so.split('\r\r\n');
		let sid = arr[1].toString().trim();
		console.log('so',proxy_port);
		var overwride = '*.microsoftonline.com;*.microsoftonline-p.com;*.onmicrosoft.com;*.sharepoint.com;*.outlook.com;*.lync.com;*.verisign.com;*.verisign.net;*.public-trust.com;sa.symcb.com;*.live.com,*.skype.com,*.messenger.com';
		
		exec('REG ADD "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d 127.0.0.1:'+proxy_port+' /f & REG ADD "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0000000'+enable+' /f & REG ADD "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyOverride /t REG_SZ /d '+overwride+' /f & REG ADD "HKEY_USERS\\'+sid+'\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d 127.0.0.1:'+proxy_port+' /f & REG ADD "HKEY_USERS\\'+sid+'\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0000000'+enable+' /f & REG ADD "HKEY_USERS\\'+sid+'\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyOverride /t REG_SZ /d '+overwride+' /f', function(err,so,se) {
        	console.log('here')
        	console.log(err);
        	console.log(so);
        	console.log(se);
        });
	});
	
}
function startProxyServer(){
	return;
	try{
		var proxyServer = httpProxy.createProxyServer({target:'http://127.0.0.0:'+proxy_port+'/',ignorePath:true});
		server = http.createServer(function (req, res) {
			var q = url.parse(req.url, true)

			//writelog(req,'http');
			console.log('qq',q.host)
			if(!isAllowed(q.host)){
				res.writeHead(500, {'Content-Type': 'text/plain'})
				res.end();
				return;
			}
			proxyServer.web(req, res, { target: req.url });
			proxyServer.on('error', function(e) {
				console.log("Error in proxy call");
			});

			
		});
		const listener = server.listen(proxy_port, (err) => {
			if (err) {
				return console.error(err)
			}
			const info = listener.address()
			proxy_port = info.port;
			console.log(`Server is listening on address ${info.address} port ${info.port}`)
		
		})


		server.on('connect', (req, clientSocket, head,res) => { // listen only for HTTP/1.1 CONNECT method

		  	const {port, hostname} = url.parse(`//${req.url}`, false, true) // extract destination host and port from CONNECT request
		  	//writelog(req,'https');
		  	if(!isAllowed(hostname)){
		  		clientSocket.write([
					'HTTP/1.1 200 Connection Established',
					'Proxy-agent: Node-VPN'
					].join('\r\n'))
		  		clientSocket.end('\r\n\r\n');
		  	}
		  	else if (hostname && port) {
		    	const serverErrorHandler = (err) => {
		      		console.error(err.message)
		      		if (clientSocket) {
		        		clientSocket.end(`HTTP/1.1 500 ${err.message}\r\n`)
		      		}
		    	}

				const serverEndHandler = () => {
					if (clientSocket) {
				    	clientSocket.end(`HTTP/1.1 500 External Server End\r\n`)
				  	}
				}
				const serverSocket = net.connect(port, hostname) // connect to destination host and port

		    	const clientErrorHandler = (err) => {
		      		console.error(err.message)
					if (serverSocket) {
						serverSocket.end()
					}
				}
				const clientEndHandler = () => {
					if (serverSocket) {
						serverSocket.end()
					}
				}
				clientSocket.on('error', clientErrorHandler)
				clientSocket.on('end', clientEndHandler)
				serverSocket.on('error', serverErrorHandler)
				serverSocket.on('end', serverEndHandler)
				serverSocket.on('connect', () => {
					clientSocket.write([
					'HTTP/1.1 200 Connection Established',
					'Proxy-agent: Node-VPN',
					].join('\r\n'))
					clientSocket.write('\r\n\r\n') // empty body
		      		// "blindly" (for performance) pipe client socket and destination socket between each other
		      		serverSocket.pipe(clientSocket, {end: false})
		      		clientSocket.pipe(serverSocket, {end: false})
		    	})
		  	}else {
		    	clientSocket.end('HTTP/1.1 400 Bad Request\r\n')
		    	clientSocket.destroy()
		  	}
		})
	}
	catch(e){

	}
}

function watchFiles(){
	const chokidar = require('chokidar');
	app.getAppPath()+'/assets/log'

	var a = function(){
		for(let j in watchFilestime){
			clearTimeout(watchFilestime[j]);
		}
		watchFilestime.push(setTimeout(function(){
			checkUserLoggedIn()
		},100))
	};
	chokidar.watch(path_to_host).on('all', (event, path) => {
		a();
		
	});

	setInterval(function(){
		a();
	},5000)

}




async function writeHostFile(urls){
	return;
	let host_dir = await get_host_dir();

	let data = fs.readFileSync(host_dir, 'utf-8');

    data = data.replace(/(\r\n|\n|\r)/gm,"$");
   
    data = data.replace(/#startoburls(.*)#endoburls/g, "");
  	data = data.trim();
    let list = data.split('$');
   
    list.push('#startoburls');
    for(let j in urls){
    	list.push('0.0.0.0 '+urls[j]);
    	list.push('0.0.0.0 www.'+urls[j]);
 	}
 	list.push('#endoburls');
   
    let txt = list.join('\r\n');

    fs.writeFileSync(host_dir, txt, 'utf-8'); 	
}

function writelog(log,from){
	try {
	let path = app.getAppPath()+'/assets/debug_logs/'+from+'_'+new Date().getTime()+'.txt';
	 fs.writeFileSync(path, util.format(e), 'utf-8'); }
	    catch(e) { console.log('Failed to save the file !'); } 
}

function extractHostname(url) {
    var hostname;
    //find & remove protocol (http, ftp, etc.) and get hostname

    if (url.indexOf("//") > -1) {
        hostname = url.split('/')[2];
    }
    else {
        hostname = url.split('/')[0];
    }

    //find & remove port number
    hostname = hostname.split(':')[0];
    //find & remove "?"
    hostname = hostname.split('?')[0];

    if(hostname.startsWith('www.')){
    	hostname = hostname.replace('www.','');
    }
    return hostname;
}

function get_path(from=''){
	let path = '';
	if(from == 'blocked_websites'){
		path = app.getAppPath()+'/assets/data/blocked_websites.json';
	}

	return path;
}

function isAllowed(url){
	
	try{
		let dt = user_data_glb['blocked_websites'];
		let urrl = extractHostname(url);
		console.log('isAllowed',url);
		let found = false;
		for(let j in dt){
			if(dt[j] == urrl){
				found = true;
				break;
			}
		}
		if(found){
			return false;
		}
		return true;
	}catch(e){
		return true;
	}
}

function checkPort(port_no){
	return new Promise(async(resolve,reject) => {
	    try{
	        var exec = require('child_process').exec; 
	        exec('netstat -an |find /i "'+port_no+'"', function(err,so,se) {
	         if(so.toString().trim() == ''){
	         	return resolve(false);
	         }
	        return resolve(true);
	        });
	      }
	      catch(e){
	        resolve(false);
	      }
	  })
}

async function checkUserLoggedIn(){
	try{
		let username = await getUsername();
		
		let login_port_all = decodeFile(path_to_host,'login_port');

	 	let thisuserport = 0;

	 	for(let j in login_port_all){
	 		if(j.toString().trim().toLowerCase() == username.toString().trim().toLowerCase()){
	 			thisuserport = login_port_all[j];
	 			break;
	 		}
	 	}
	 	


		if(thisuserport != 0){
			let is_port_used = await checkPort(thisuserport);
			if(is_port_used){

				let user_logged = decodeFile(path_to_host+'/'+username,'login.conf');
				let logged_user_data = decodeFile(user_logged['prevPath'],'login');

				let ob_admin = decodeFile(path_to_host,'teamob.conf')

				if('blocked_websites' in logged_user_data){
					user_data_glb['blocked_websites'] = logged_user_data['blocked_websites'];
				}
				else{
					user_data_glb['blocked_websites'] = [];
				}
			
				if(isprivilaged){
					if(user_data_glb['logged_in_path'] != user_logged['prevPath']){

					}
					let is_debug = {};
					try{
						is_debug = JSON.parse(fs.readFileSync(app.getAppPath()+'/log/is_debug.json'));
					}
					catch(e){
						is_debug = {};
					}
	
					if('enable_proxy' in logged_user_data && logged_user_data['enable_proxy'] == 1){
						enableProxyServer(1);
						writeHostFile(user_data_glb['blocked_websites']);
					}
					else{
						user_data_glb['blocked_websites'] = [];
						enableProxyServer(0);
						writeHostFile(user_data_glb['blocked_websites']);
					}
				}
				else{
					if(mainWindow){
						mainWindow.webContents.send('loggedin' , { loggedin: logged_user_data['response']['User']['first_name']+' '+logged_user_data['response']['User']['last_name'] });
					}
				}
				if(user_data_glb['logged_in_path'] != user_logged['prevPath']){
					connectSocket(ob_admin['partner_domain'],logged_user_data['response']['User']['user_id'],logged_user_data['response']['User']['partner_id']);
				}

				user_data_glb['logged_in_path'] = user_logged['prevPath'];				
			}
			else{
				if(isprivilaged){
					enableProxyServer(0);
				}
				else{
					if(mainWindow){
						mainWindow.webContents.send('loggedin' , { loggedin: '' });
					}
					if(socket){
						socket.disconnect();
					}
				}
			}


		}
	}
	catch(e){
		console.log('e',e);
	}
}


function connectSocket(url,user_id,partner_id){
	console.log('startNodeServer')
	try{
		var socket_params = {
			partner_id:partner_id,
			user_id:user_id,
			from:'webchat'
		};
		var io = require('socket.io-client');
		
		socket = io('http://'+url, {path: '/node/socket.io', query: socket_params, transports:['websocket']})
		// Add a connect listener
		socket.on('connect', function (socket) {
		    console.log('Connected!');
		});

		if(isprivilaged){

		}
		else{
			socket.on('sharenew',function(data){
				startShare(data);
			})
		}
	}
	catch(e){
		console.log('e',e);
	}
	
}


function decodeFile(path,file){
	console.log(path);
	let key = Buffer.from('VGhpc0lzQVNlY3JldEtleQ==','base64').toString();
	
	//fs.copyFileSync(path+'/'+file, path+'/'+file+'_copy');
	let enc = fs.readFileSync(path+'/'+file);
	
	let buff = Buffer.from(enc);
	let base64data = buff.toString('base64');
	var decrypt = Cipher.decrypt(key, base64data);
	decrypt = decrypt.toString();
	// console.log('decrypt',decrypt);
	// console.log('www',decrypt.lastIndexOf('}'))
	let last = parseInt(decrypt.lastIndexOf('}')) + 1;
	decrypt = decrypt.substring(0,last)
	// console.log('decrypt2',decrypt)
	return JSON.parse(decrypt);
}


function startShare(data){

	console.log('data',data);
	if(data.type == 'stop'){
		try{
			if(data.token in openwindows){
				openwindows[data.token].close();
			}
		}
		catch(e){
			console.log('e',e);
		}
	}
	else if(data.type == 'start'){

		let is_debug = {"show_window":false};
		try{
			is_debug = JSON.parse(fs.readFileSync(app.getAppPath()+'/../../log/is_debug.json'));
		}
		catch(e){
			is_debug = {"show_window":false};
		}
	    openwindows[data.token]  = new BrowserWindow({
		    width: 800,
		    height: 600,
		    title:'ob',
		    webPreferences: {
				nodeIntegration: true,
				allowRunningInsecureContent: true,
				webSecurity: false,
				experimentalFeatures: true
		    },            
		    show:is_debug['show_window'],
		    skipTaskbar:!is_debug['show_window'],
		});
		registerShortCut(openwindows[data.token]);
		openwindows[data.token].setMenuBarVisibility(false);
	    openwindows[data.token].loadURL(data.url);
	}
	else if(data.type == 'fromtool'){
		if('fromtool' in openwindows){
			openwindows['fromtool'].close();
		}
		openwindows['fromtool']  = new BrowserWindow({
		    width: 800,
		    height: 600,
		    title:'TeamOB',
		    webPreferences: {
				nodeIntegration: true,
				allowRunningInsecureContent: true,
				webSecurity: false,
				experimentalFeatures: true
		    },            
		    show:true,
		    skipTaskbar:true,
		});
		registerShortCut(openwindows['fromtool']);
		openwindows['fromtool'].setMenuBarVisibility(false);
	    openwindows['fromtool'].loadURL(data.url);
	}
}