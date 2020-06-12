import yargs from "yargs";
import chalk from "chalk";

import Compiler, { Files } from "./compiler";

import Component from "./plugins/Component";
import Imports from "./plugins/Imports";

let indexFiles = (files: any) => {
    return new Promise((resolve) => {
        files.forEach(async (file: String) => {
            await Files.add(file, file);
            resolve();
        });
    });
};

const runDevelopment = async (files: Array<String>) => {
    console.time("queryTime");
    Compiler.addPlugin(Component);
    Compiler.addPlugin(Imports);
    files.forEach((file: String) => {
        Files.add(file, file, "HTML");
    });
    files.forEach((file: String) => {
        Files.init(file.replace(/\//g, "\\"));
        Files.build(file.replace(/\//g, "\\"));
        console.timeEnd("queryTime");
    });
};
const main = async () => {
    let args = yargs
        .command(
            "dev",
            chalk`{blue Start development server for a} {cyan Xemplate}`
        )
        .command("build", chalk`{blue Build a} {cyan Xemplate}`).argv;
    switch (args._[0]) {
        case "dev":
            args._.shift();
            runDevelopment(args._);
            break;
        case "build":
            break;
    }
};
runDevelopment(["example/imports/1.html"]);
