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
    onIndex?: Function;
    onBuild?: Function;
    onFilter?: Function;
}

const components: Map<string, Object> = new Map();

const addComponent = (id: string, ast: Object) => {
    components.set(id, ast);
};
const parseComponent = (id: string, tag: IXemTagNode): any => {
    let component = components.get(id);
    let findValues = (tags) => {
        tags.map(() => {});
    };
    findValues(tag.children);
    return tag;
};
const Component: IXemPlugin = {
    onIndex: (file: string, tag: IXemTagNode) => {
        if (tag.type == "tag") {
            if (tag.name == "template") {
                if (tag.attrs.id != undefined) {
                    addComponent(tag.attrs.id, tag);
                }
            }
        }
    },
    onBuild: (tag, buildAST) => {
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
                            if (components.has(child.name)) {
                                let component: IXemTagNode = parseComponent(
                                    child.name,
                                    child
                                );
                                nodes = nodes.concat(component);
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

    onFilter: (tag) => {
        if (tag.type === "tag") {
            if (tag.name == "template") {
                return false;
            }
        }
        return true;
    },
};

export default Component;
