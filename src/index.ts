import yargs from "yargs";
import chalk from "chalk";

import Compiler, { Files } from "./compiler";

import Component from "./plugins/Component";
import { resolve } from "dns";

let indexFiles = (files: any) => {
    return new Promise((resolve) => {
        files.forEach(async (file: String) => {
            await Files.add(file);
            resolve();
        });
    });
};

const runDevelopment = async (files: Array<String>) => {
    Compiler.addPlugin(Component);
    await indexFiles(files);
    files.forEach((file: String) => {
        Files.build(file);
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
runDevelopment(["example.html"]);
