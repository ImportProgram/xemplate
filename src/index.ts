import yargs from "yargs";
import chalk from "chalk";

import Compiler, { Files } from "./compiler";

import Component from "./plugins/Component";
import Imports from "./plugins/Imports";
import HMR from "./plugins/HMR";

const runDevelopment = async (files: Array<String>) => {
    Compiler.addPlugin(Component);
    Compiler.addPlugin(Imports);
    Compiler.addPlugin(HMR);
    Compiler.loadStart();
    files.forEach((file: String) => {
        Files.add(file, file, "HTML");
    });
    files.forEach((file: String) => {
        Files.init(file.replace(/\//g, "\\"));
        Files.build(file.replace(/\//g, "\\"));
    });
    Compiler.loadEnd();
};

const runBuild = async (files: Array<String>) => {
    Compiler.addPlugin(Component);
    Compiler.addPlugin(Imports);
    Compiler.loadStart();
    files.forEach((file: String) => {
        Files.add(file, file, "HTML");
    });
    files.forEach((file: String) => {
        Files.init(file.replace(/\//g, "\\"));
        Files.build(file.replace(/\//g, "\\"));
    });
    Compiler.loadEnd();
    Compiler.buildEnd();
};

const main = async () => {
    let args = yargs
        .command(
            "dev",
            chalk`{blue Start development server for a} {cyan Xemplate}`
        )
        .command("build", chalk`{blue Build a} {cyan Xemplate}`)
        .showHelpOnFail(true)
        .demandCommand(1, "").argv;
    switch (args._[0]) {
        case "dev":
            args._.shift();
            runDevelopment(args._);
            break;
        case "build":
            args._.shift();
            runBuild(args._);
            break;
    }
};
main();
