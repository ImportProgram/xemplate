import fs from "fs";
import fse from "fs-extra";
import chalk from "chalk";
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
    loadEnd: Function;
    loadStart: Function;
    buildEnd: Function;
}
interface IXemPlugin {
    onIndex: Function;
    onIndexStart: Function;
    onIndexEnd: Function;
    onInit: Function;
    onBuild: Function;
    onFilter: Function;
    onChange: Function;
    onSave: Function;
    onLoadStart: Function;
    onLoadEnd: Function;
}

let mode = "DEVELOPMENT";

let buildFolder: string = "./dist";

let astFiles: Map<string, any> = new Map();
let astIdentifier: Map<string, string> = new Map();
let astType: Map<string, string> = new Map();

let plugins: Array<IXemPlugin> = [];

let startTime;

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
    startTime = process.hrtime();
    if (fs.existsSync(file)) {
        file = file.replace(/\//g, "\\");
        watcher.add(file);

        const content: string = readFile(file);
        const data: string = HTML.parse(content);
        astFiles.set(file, data);
        astIdentifier.set(file, id);
        astType.set(file, type);
        indexFile(file);
    } else {
        console.log(
            chalk`{cyan [Xemplate]} {red Invalid file: } {green ${file}}`
        );
    }
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
/**
 * FilterAST - Filters any AST (remove) they isn't needed, also shows the level of which the AST tag node is on
 * @param nodes IXemTagNode A tag by the html-parse-stringify2 module
 */
const filterAST = (nodes): any => {
    //
    let filter = (tags, level, callback): any => {
        //Loop all tag elements
        tags.forEach((element, i) => {
            //Use the filter callback to check if the tag will be kept
            let state = callback(element, level);
            //If the tag is kept we can check if it has children
            if (state == true) {
                //Do the children check
                if (tags[i].children != undefined) {
                    //Also make sure they have at least 1 children tag node
                    if (tags[i].children.length > 0) {
                        //If so, we will set the children tag node to filter
                        //but also increase the level of nodes going down
                        tags[i].children = filter(
                            tags[i].children,
                            level + 1,
                            callback
                        );
                    }
                }
            } else {
                //If we dont have a true state, just delete the node and do nothing
                //because all nodes below this node are gone so no point in looping
                //them
                delete tags[i];
            }
        });
        //Return any tags that are kept
        return tags;
    };
    //First we want to return a list of nodes to keep, but we have to pass
    //the base nodes, level and a callback to check the nodes
    return filter(nodes, 0, (tag, level) => {
        //When the node has to be check (they all do)
        //The state by default is true
        let state = true;
        //Loop all the plugins using an old fashion array (ik forEach is better.... lol)
        for (let p in plugins) {
            //Get the plugin object
            let plugin = plugins[p];
            //Check if we have a plugin
            if (plugin.onFilter != undefined)
                state = plugin.onFilter(tag, level);
            //If the plugin return false, BREAK the loop because any false is not going to return that node
            if (state == false) break;
        }
        return state;
    });
};

/**
 * buildAST - Builds the AST tree
 * @param tags IXemTagNode A tag by the html-parse-stringify2 module
 * @param file The file thats currently being parsed
 */
const buildAST = (tags, file): any => {
    //First lets loop through the base tags. tags are always an array
    return tags.map((tag: IXemTagNode) => {
        //Loop all plugins
        plugins.forEach((plugin) => {
            //Check if they have the onBuild function
            if (plugin.onBuild != undefined)
                //And if they do, we can let the process whatever for this tag
                tag = plugin.onBuild(tag, buildAST, file);
            //If they choose to do so, they can return whatever they want
        });

        //If the tag type (which can be tag, comment or text) is a tag, we want to go deeper
        if (tag.type === "tag") {
            //Check if we have any children, if we dont, do go down deeper
            if (tag.children.length > 0) {
                //But if we do have children, lets recursively go down but set our current children to those tag nodes
                tag.children = buildAST(tag.children, file);
            }
        }
        return tag;
    });
};

/**
 * Build File (AST --> HTML)
 * - This will build all HTML (root) from the AST parsed originally,
 *   through all the plugins back into html and saved
 * @param file
 */
const buildFile = (file: string) => {
    //Check if we have the AST file
    if (astFiles.has(file)) {
        //Now get the AST file, but do it as a deepClone so we don't modify the original (for caching)
        let ast: any = cloneDeep(astFiles.get(file));
        //Now first lets filter the AST to begin with, allowing for plugins to remove un-needed HTML Tags
        let fAST = filterAST(ast);
        //Next lets build the AST, this will parse all level of syntax for use with custom tag syntax or similar
        let outputAST = buildAST(fAST, file);
        //Covert the outputAST to a HTML String
        let output = HTML.stringify(outputAST);
        //Save the file after its been parsed
        var result = minify(output, {
            collapseWhitespace: true,
            removeAttributeQuotes: false,
            html5: true,
            minifyJS: true,
            minifyCSS: true,
        });
        fse.outputFile(
            buildFolder + "/" + path.basename(file),
            result,
            function (err) {
                let hrend = process.hrtime(startTime);
                if (hrend[0] > 0) {
                    console.log(
                        chalk`{cyan [Xemplate]} {blue Compiled in} {green ${hrend[0]}s}`
                    );
                } else {
                    console.log(
                        chalk`{cyan [Xemplate]} {blue Compiled in} {green ${
                            hrend[1] / 1000000
                        }ms}`
                    );
                }

                plugins.forEach((plugin) => {
                    if (plugin.onSave != undefined)
                        plugin.onSave(file, result, err);
                });
            }
        );
    }
};
/**
 * Initialize File - When a file is going to be parsed, this will trigger
 * @param file File Path
 */
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
        console.clear();
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
    loadStart: () => {
        plugins.forEach((plugin) => {
            if (plugin.onLoadStart != undefined) plugin.onLoadStart(mode);
        });
    },
    loadEnd: () => {
        plugins.forEach((plugin) => {
            if (plugin.onLoadEnd != undefined) plugin.onLoadEnd(mode);
        });
    },
    buildEnd: () => {
        console.log(
            chalk`{cyan [Xemplate]} {blue Build output located in} {green ${buildFolder}}`
        );
        watcher.close();
    },
};

export default Compile;
