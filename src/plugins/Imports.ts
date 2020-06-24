import path from "path";
import slash from "slash";

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
    onIndex: async (file, type, tag, parseAST) => {
        if (tag.type == "tag") {
            if (tag.name == "import") {
                if (tag.attrs.src != undefined) {
                    let location: string = path.normalize(
                        path.dirname(file) + "/" + slash(tag.attrs.src)
                    );
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
