import fs from "fs";
import HTML from "html-parse-stringify2";
import pretty from "pretty";
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
}
interface ICompiler {
    setBuildDirectory: Function;
    addPlugin: Function;
}
interface IXemPlugin {
    onIndex: Function;
    onBuild: Function;
    onFilter: Function;
}

let buildFolder: string = "./dist";

let astFiles: Map<string, any> = new Map();
let plugins: Array<IXemPlugin> = [];

let buildFileCache: Map<string, any> = new Map();

const readFile = (fileName: any) => {
    return new Promise<string>((resolve, reject) => {
        fs.readFile(fileName, "utf8", function (error: any, data: string) {
            if (error) return reject(error);
            resolve(data);
        });
    });
};
/**
 * parseAST - Parses the files AST and then saves it
 * @param file Path of a file
 */
const parseAST = async (file: string) => {
    const content: string = await readFile(file);
    const data: string = HTML.parse(content);
    astFiles.set(file, data);
    indexFile(file);
};
const indexFile = (file: string) => {
    if (astFiles.has(file)) {
        let ast: any = astFiles.get(file);
        let findTags = (tags) => {
            tags.forEach((tag: IXemTagNode) => {
                plugins.forEach((plugin) => plugin.onIndex(file, tag));
                if (tag.type == "tag") {
                    findTags(tag.children);
                }
            });
        };
        findTags(ast);
    }
};
const buildAST = (tags): any => {
    tags = tags.filter((tag: IXemTagNode) => {
        let state = true;
        for (let p in plugins) {
            let plugin: IXemPlugin = plugins[p];
            state = plugin.onFilter(tag);
            if (state == false) break;
        }
        return state;
    });
    return tags.map((tag: IXemTagNode) => {
        plugins.forEach((plugin) => {
            tag = plugin.onBuild(tag, buildAST);
        });

        if (tag.type === "tag") {
            if (tag.children.length > 0) {
                tag.children = buildAST(tag.children);
            }
        }
        return tag;
    });
};

const buildFile = (file: string) => {
    if (astFiles.has(file)) {
        let ast: any = astFiles.get(file);
        let outputAST = buildAST(ast);
        let output = HTML.stringify(outputAST);
        let prettify = pretty(output, { ocd: true });
        console.log(prettify);
    }
};

const Files: IFiles = {
    add: parseAST,
    build: buildFile,
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
