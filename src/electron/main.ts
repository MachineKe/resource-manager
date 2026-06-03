import {app, BrowserWindow} from 'electron'
import path from 'path'
import {isDev} from './util.js'


// type test = string


app.on("ready",()=>{
    const mainWindow = new BrowserWindow({});
    if(isDev()){
        const loadDevServer = () => {
            if (mainWindow.isDestroyed()) return;
            mainWindow.loadURL('http://localhost:5123').catch(() => {
                setTimeout(loadDevServer, 200); // Retry every 200ms until Vite is ready
            });
        };
        loadDevServer();
    }else{
        mainWindow.loadFile(path.join(app.getAppPath()+'/dist-react/index.html'));
    }
})