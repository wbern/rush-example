const fs = require("fs");
const path = require("path");
const util = require("util");

const Choices = require("inquirer/lib/objects/choices");
const InquirerAutocomplete = require("inquirer-autocomplete-prompt");
const stripAnsi = require("strip-ansi");
const style = require("ansi-styles");
const fuzzy = require("fuzzy");

const { RushConfiguration } = require("@microsoft/rush-lib");

const rushConfig = RushConfiguration.loadFromDefaultLocation();

const readdir = util.promisify(fs.readdir);

function getPaths(pattern, defaultItem) {
  const fuzzOptions = {
    pre: style.green.open,
    post: style.green.close
  };

  async function listNodes(nodePath, level) {
    return rushConfig.projects.map(project => project.packageName);
  }

  const nodes = listNodes();
  const filterPromise = nodes.then(nodeList => {
    const filteredNodes = fuzzy
      .filter(pattern || "", nodeList, fuzzOptions)
      .map(e => e.string);
    if (!pattern && defaultItem) {
      filteredNodes.unshift(defaultItem);
    }
    return filteredNodes;
  });
  return filterPromise;
}

class InquirerFuzzyPath extends InquirerAutocomplete {
  constructor(question, rl, answers) {
    const {} = question;
    const questionBase = Object.assign({}, question, {
      source: (_, pattern) => getPaths(pattern, question.default)
    });
    super(questionBase, rl, answers);
  }

  search(searchTerm) {
    return super.search(searchTerm).then(() => {
      this.currentChoices.getChoice = choiceIndex => {
        const choice = Choices.prototype.getChoice.call(
          this.currentChoices,
          choiceIndex
        );
        return {
          value: stripAnsi(choice.value),
          name: stripAnsi(choice.name),
          short: stripAnsi(choice.name)
        };
      };
    });
  }

  onSubmit(line) {
    super.onSubmit(stripAnsi(line));
  }
}

module.exports = InquirerFuzzyPath;
