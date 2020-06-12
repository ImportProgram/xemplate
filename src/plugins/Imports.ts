import path from "path";
import cloneDeep from "lodash/cloneDeep";
import { Files } from "../compiler";

interface IAttr {
    [id: string]: string;
}
interface IXemTagNode {
    type: string;
    attrs: IAttr;
    name: string;
    content?: string;
    children: Array<IXemTagNode>;
}
interface IXemPlugin {
    onIndexStart?: Function;
    onIndexEnd?: Function;
    onIndex?: Function;
    onInit?: Function;
    onBuild?: Function;
    onFilter?: Function;
    onChange?: Function;
}

let importCache = {};

const updateHTML = (importFile) => {
    let findFiles = (file) => {
        let files: Array<string> = [];
        if (importCache[file] != undefined) {
            for (let src in importCache[file]) {
                let type = importCache[file][src];
                if (type == "HTML") {
                    files.push(src);
                } else {
                    if (importCache[file] != undefined) {
                        files = files.concat(findFiles(src));
                    }
                }
            }
        }
        return files;
    };
    return findFiles(importFile);
};

const Imports: IXemPlugin = {
    onIndexStart: (file, type) => {
        //delete importCache[file];
    },
    onIndex: async (file, type, tag, parseAST) => {
        if (tag.type == "tag") {
            if (tag.name == "import") {
                if (tag.attrs.src != undefined) {
                    let location: string =
                        path.dirname(file) + "\\" + tag.attrs.src;
                    let as = "";
                    if (importCache[location] == undefined) {
                        importCache[location] = {};
                        importCache[location][file] = type;
                        if (tag.attrs.as != undefined) as = tag.attrs.as;
                        parseAST(location, as, "IMPORT");
                    } else {
                        importCache[location][file] = type;
                    }
                }
            }
        }
    },
    onIndexEnd: (file) => {},
    onInit: (file, getAST, filterAST, buildAST) => {},
    onBuild: (tag) => {
        return tag;
    },
    onFilter: (tag, level) => {
        if (level == 0) {
            if (tag.type === "tag") {
                if (tag.name == "import") {
                    return false;
                }
            }
        }
        return true;
    },
    onChange: (path, as, type, ast, parseAST, buildFile) => {
        if (type == "IMPORT") {
            parseAST(path, as, type);
            let rebuilds = updateHTML(path);

            rebuilds.map((file) => {
                buildFile(file);
            });
        }
    },
};

export default Imports;
