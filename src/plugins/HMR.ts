import express from "express";
import path from "path";
import WebSocket from "ws";
import HTML from "html-parse-stringify2";

const EXPRESS_PORT = 7500;
const WEBSOCKET_PORT = 7501;

const app = express();
app.use(express.static(path.join(process.cwd(), "dist")));

app.listen(EXPRESS_PORT, () => {
    console.log(`Xemplate listening http://localhost:${EXPRESS_PORT}`);
});

const wss = new WebSocket.Server({ port: WEBSOCKET_PORT });

wss.broadcast = function broadcast(action) {
    wss.clients.forEach(function each(client) {
        client.send(JSON.stringify(action));
    });
};

wss.on("connection", (ws) => {
    console.log("Connection!");
    ws.on("message", (message) => {
        console.log("message");
    });
});

interface IXemPlugin {
    onIndexStart?: Function;
    onIndexEnd?: Function;
    onIndex?: Function;
    onInit?: Function;
    onBuild?: Function;
    onFilter?: Function;
    onChange?: Function;
    onSave?: Function;
    onLoad?: Function;
}

const HMR: IXemPlugin = {
    onSave: (file, html, error) => {
        console.log("Updating Clients..");
        wss.broadcast({ type: "UPDATE", file: file, html: html });
    },
    onBuild: (tag, buildAST, file) => {
        if (tag.type === "tag") {
            if (tag.name == "head") {
                let children = tag.children;
                tag.children.push(
                    HTML.parse(`
                <script>
                    
                    
                    if (ws == undefined) {
                        var file = "${file.replace(/\\/g, "\\\\")}"
                        var ws = new WebSocket('ws://localhost:${WEBSOCKET_PORT}');
                        ws.onopen = () => {  
                            console.log('[HMR] Connected'); 
                            document.querySelector("body").insertAdjacentHTML('afterend', '<template id="reload"></template>')
                        };
                        ws.onmessage = (event) => {
                            const action = JSON.parse(event.data);
                            if (action.type == "UPDATE") {
                                console.log(action)
                                if (action.file == file) {
                                    console.log("[HMR] Reloading")
                                    document.querySelector("body").innerHTML = action.html
                                }
                            } else if (action.type == "ERROR") {
                                console.log("error")
                            }
                        };
                        
                    }
                </script>`)[0]
                );
            }
        }
        return tag;
    },
};

export default HMR;
