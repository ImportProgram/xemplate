import deepReplaceInObject from "deep-replace-in-object";
import path from "path";
import cloneDeep from "lodash/cloneDeep";
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

const components = {};

const componentsAlias = {};

const addComponent = (file: string, id: string, ast: IXemTagNode) => {
    if (components[file] == undefined) {
        components[file] = {};
    }
    components[file][id] = ast;
};

const setComponentAlias = (file, src, as) => {
    if (componentsAlias[file] == undefined) {
        componentsAlias[file] = {};
    }
    componentsAlias[file][as] = src;
};

const parseComponent = (
    file: string,
    id: string,
    tagNode: IXemTagNode,
    buildAST
): any => {
    let component = cloneDeep(components[file][id]);
    for (let i in tagNode.attrs) {
        let value = tagNode.attrs[i];
        component = deepReplaceInObject(`@${i}`, value, component);
    }
    let findValues = (tags) => {
        return tags.map((tag) => {
            if (tag.type == "tag") {
                if (tag.children.length > 0) {
                    for (let c in tag.children) {
                        let child = tag.children[c];
                        if (child.type == "text") {
                            if (child.content.includes("$children")) {
                                tag.children.splice(c, 1);
                                tag.children.splice(c, 0, ...tagNode.children);
                            }
                        }
                    }
                    tag.children = findValues(tag.children);
                } else {
                    console.log("Wont update children");
                }
            }
            return tag;
        });
    };

    //@ts-ignore
    component.children = findValues(component.children);
    component = buildAST([component], file);
    //@ts-ignore
    return component[0].children;
};
const Component: IXemPlugin = {
    onIndexStart: () => {},
    onIndex: (file: string, id: string, tag: IXemTagNode) => {
        if (tag.type == "tag") {
            if (tag.name == "template") {
                if (tag.attrs.id != undefined) {
                    addComponent(file, tag.attrs.id, tag);
                }
            } else if (tag.name == "import") {
                if (tag.attrs.src != undefined) {
                    if (tag.attrs.as != undefined) {
                        let location: string =
                            path.dirname(file) + "\\" + tag.attrs.src;
                        setComponentAlias(file, location, tag.attrs.as);
                    }
                }
            }
        }
    },
    onBuild: (tag, buildAST, file) => {
        //Check if we have a tag
        if (tag.type == "tag") {
            //Now check if we have children for this tagh
            if (tag.children.length > 0) {
                let nodes: any = []; //A notation of children nodes
                for (let c in tag.children) {
                    //Get the child
                    let child = tag.children[c];
                    //Check if the child type is a tag
                    if (child.type === "tag") {
                        //Check if this tag is "component" tag via a uppercase first character (like React)
                        if (child.name[0] == child.name[0].toUpperCase()) {
                            //When the component is done being parsed, add the new array to the existing nodes
                            let imports = child.name.split("-");

                            if (componentsAlias[file] != undefined) {
                                if (
                                    componentsAlias[file][imports[0]] !=
                                        undefined &&
                                    components[
                                        componentsAlias[file][imports[0]]
                                    ][imports[1]] != undefined
                                ) {
                                    let src = componentsAlias[file][imports[0]];
                                    let component: IXemTagNode = parseComponent(
                                        src,
                                        imports[1],
                                        child,
                                        buildAST
                                    );
                                    nodes = nodes.concat(component);
                                }
                            } else if (components[file] != undefined) {
                                if (
                                    components[file].hasOwnProperty(child.name)
                                ) {
                                    let component: IXemTagNode = parseComponent(
                                        file,
                                        child.name,
                                        child,
                                        buildAST
                                    );
                                    nodes = nodes.concat(component);
                                } else {
                                    nodes.push(child);
                                }
                            } else {
                                nodes.push(child);
                            }
                        } else {
                            //If we dont have a component, just add the child tag normally
                            nodes.push(child);
                        }
                    } else {
                        //If we dont have a child tag, but a text tag, just add it to the nodes
                        nodes.push(child);
                    }
                }
                //Replace the nodes with the children
                tag.children = nodes;
            }
        }
        return tag;
    },
    onFilter: (tag, level) => {
        if (level == 0) {
            if (tag.type === "tag") {
                if (tag.name == "template") {
                    return false;
                }
            }
        }
        return true;
    },
};

export default Component;
