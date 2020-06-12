import fs from "fs";
import fse from "fs-extra";
import HTML from "html-parse-stringify2";
import cloneDeep from "lodash/cloneDeep";
import { FSWatcher } from "chokidar";
import { minify } from "html-minifier";
import path from "path";
interface IAttr {
    [id: string]: string;
}

interface IXemTagNode {
    type: string;
    attrs: IAttr;
    name: string;
    children: Array<IXemTagNode>;
}

interface IFiles {
    add: Function;
    build: Function;
    init: Function;
}
interface ICompiler {
    setBuildDirectory: Function;
    addPlugin: Function;
}
interface IXemPlugin {
    onIndex: Function;
    onIndexStart: Function;
    onIndexEnd: Function;
    onInit: Function;
    onBuild: Function;
    onFilter: Function;
    onChange: Function;
}

let buildFolder: string = "./dist";

let astFiles: Map<string, any> = new Map();
let astIdentifier: Map<string, string> = new Map();
let astType: Map<string, string> = new Map();

let plugins: Array<IXemPlugin> = [];

let buildFileCache: Map<string, any> = new Map();

const watcher = new FSWatcher({
    persistent: true,
});

const readFile = (fileName: any) => {
    return fs.readFileSync(fileName, "utf8");
};
/**
 * parseAST - Parses the files AST and then saves it
 * @param file Path of a file
 */
const parseAST = (file: string, id: string, type: string) => {
    file = file.replace(/\//g, "\\");
    watcher.add(file);
    const content: string = readFile(file);
    const data: string = HTML.parse(content);
    astFiles.set(file, data);
    astIdentifier.set(file, id);
    astType.set(file, type);
    indexFile(file);
};
const getAST = (file: string) => {
    return astFiles.get(file);
};

const indexFile = (file: string) => {
    if (astFiles.has(file)) {
        let ast: any = astFiles.get(file);
        let type: any = astType.get(file);
        plugins.forEach((plugin) => {
            if (plugin.onIndexStart != undefined)
                plugin.onIndexStart(file, type);
        });
        let findTags = (tags) => {
            tags.forEach((tag: IXemTagNode) => {
                plugins.forEach((plugin) => {
                    if (plugin.onIndex != undefined)
                        plugin.onIndex(file, type, tag, parseAST);
                });
                if (tag.type == "tag") {
                    findTags(tag.children);
                }
            });
        };
        plugins.forEach((plugin) => {
            if (plugin.onIndexEnd != undefined) plugin.onIndexEnd(file, type);
        });
        findTags(ast);
    }
};

const filterAST = (nodes): any => {
    let filter = (tags, level, callback): any => {
        tags.forEach((element, i) => {
            let state = callback(element, level);
            if (state == true) {
                if (tags[i].children != undefined) {
                    if (tags[i].children.length > 0) {
                        tags[i].children = filter(
                            tags[i].children,
                            level + 1,
                            callback
                        );
                    }
                }
            } else {
                delete tags[i];
            }
        });
        return tags;
    };
    return filter(nodes, 0, (tag, level) => {
        let state = true;
        for (let p in plugins) {
            let plugin = plugins[p];
            if (plugin.onFilter != undefined)
                state = plugin.onFilter(tag, level);
            if (state == false) break;
        }
        return state;
    });
};

const buildAST = (tags, file): any => {
    return tags.map((tag: IXemTagNode) => {
        plugins.forEach((plugin) => {
            if (plugin.onBuild != undefined)
                tag = plugin.onBuild(tag, buildAST, file);
        });

        if (tag.type === "tag") {
            if (tag.children.length > 0) {
                tag.children = buildAST(tag.children, file);
            }
        }
        return tag;
    });
};

const buildFile = (file: string) => {
    if (astFiles.has(file)) {
        let ast: any = cloneDeep(astFiles.get(file));
        let fAST = filterAST(ast);
        let outputAST = buildAST(fAST, file);
        let output = HTML.stringify(outputAST);
        var result = minify(output, {
            collapseWhitespace: true,
            removeAttributeQuotes: true,
            html5: true,
            minifyJS: true,
            minifyCSS: true,
        });
        fse.outputFile(
            buildFolder + "/" + path.basename(file),
            result,
            function (err) {
                if (err) {
                    return console.log(err);
                }
            }
        );
    }
};

const initFile = (file: string) => {
    if (astFiles.has(file)) {
        plugins.forEach((plugin) => {
            if (plugin.onInit != undefined)
                plugin.onInit(file, getAST, filterAST, buildAST);
        });
    }
};

/**
 * File Save Change
 * - When a file is saved, the plugins will do there thing first, and if the type
 *   is html, the base compiler will attempt to transpile the syntax
 */
watcher.on("change", (path) => {
    //Make sure said AST file has already been added (so we can use caching)
    if (astFiles.has(path)) {
        //Get the type of the abstract tree
        let type: any = astType.get(path);
        let id: any = astIdentifier.get(path);
        const content: string = readFile(path);
        const ast: string = HTML.parse(content);
        plugins.forEach((plugin) => {
            if (plugin.onChange != undefined)
                plugin.onChange(
                    path,
                    id,
                    type,
                    ast,
                    parseAST,
                    buildFile,
                    filterAST
                );
        });
        //By default any HTML files will be re-parsed
        if (type == "HTML") {
            parseAST(path, path, type);
            buildFile(path);
        }
    }
});

const Files: IFiles = {
    add: parseAST,
    build: buildFile,
    init: initFile,
};

export { Files };

const Compile: ICompiler = {
    setBuildDirectory: (folder: string) => {
        buildFolder = folder;
    },
    addPlugin: (plugin: IXemPlugin) => {
        plugins.push(plugin);
    },
};

export default Compile;
