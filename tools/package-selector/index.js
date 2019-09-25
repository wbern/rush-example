const inquirer = require("inquirer");
inquirer.registerPrompt("fuzzypath", require("./lib.js"));

let createSearchQuestion = () => [
  {
    type: "fuzzypath",
    name: "path",
    message: "Select a package you'd like to add for execution.",
    // default: "",
    suggestOnly: false
    // suggestOnly :: Bool
    // Restrict prompt answer to available choices or use them as suggestions
  }
];

const startPrompt = () =>
  inquirer.prompt(createSearchQuestion()).then(startPrompt)

startPrompt();
