import express from "express";
import path from "path";
import chalk from "chalk";
import WebSocket from "ws";
import HTML from "html-parse-stringify2";

const EXPRESS_PORT = 7500;
const WEBSOCKET_PORT = 7501;

interface IXemPlugin {
    onIndexStart?: Function;
    onIndexEnd?: Function;
    onIndex?: Function;
    onInit?: Function;
    onBuild?: Function;
    onFilter?: Function;
    onChange?: Function;
    onSave?: Function;
    onLoadStart?: Function;
    onLoadEnd?: Function;
}
let wss;
const app = express();
let files = {};

const HMR: IXemPlugin = {
    onIndex: (file, type) => {
        if (type == "HTML") {
            if (files[file] == undefined) {
                files[file] = file;
                let f = path.basename(file);
                let url = `http://localhost:${EXPRESS_PORT}/${f}`;

                console.log(
                    chalk`{cyan [Xemplate]} {blue ${file}} {gray - }{yellow ${url}} \n`
                );
            }
        }
    },
    onLoadStart: () => {
        app.use(express.static(path.join(process.cwd(), "dist")));

        app.listen(EXPRESS_PORT);
        wss = new WebSocket.Server({ port: WEBSOCKET_PORT });

        wss.broadcast = function broadcast(action) {
            wss.clients.forEach(function each(client) {
                client.send(JSON.stringify(action));
            });
        };
    },
    onLoadEnd: () => {
        app.get("/", function (req, res) {
            let message = "<ul>";
            for (let file in files) {
                let f = path.basename(file);
                message += `<li><a href="http://localhost:${EXPRESS_PORT}/${f}">${f}</li>`;
            }
            res.send(message);
        });
    },
    onSave: (file, html, error) => {
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
                                    document.title = document.querySelector("body").querySelector("title").innerText
                                    
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
