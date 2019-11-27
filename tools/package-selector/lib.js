const fs = require('fs')
const path = require('path')
const util = require('util')

const Choices = require('inquirer/lib/objects/choices')
const ansiEscapes = require('ansi-escapes')
const InquirerAutocomplete = require('inquirer-autocomplete-prompt')
const stripAnsi = require('strip-ansi')
const style = require('ansi-styles')
const fuzzy = require('fuzzy')

const { RushConfiguration } = require('@microsoft/rush-lib')

const rushConfig = RushConfiguration.loadFromDefaultLocation()

// const readdir = util.promisify(fs.readdir);

async function listNodes(exclude) {
    let scripts = ['[go back]']

    rushConfig.projects.forEach(project =>
        Object.keys(project.packageJson.scripts || {}).forEach(scriptName =>
            scripts.push(
                project.packageName +
                    ' -> ' +
                    scriptName.replace(' -> ', ':FUN_GUY_WAS_HERE:')
            )
        )
    )

    return scripts.filter(name => !exclude.includes(name))
}

function getRushProjects(pattern, defaultItem, excludeItems = []) {
    const fuzzOptions = {
        pre: style.green.open,
        post: style.green.close,
    }

    const nodes = listNodes(excludeItems)
    const filterPromise = nodes.then(nodeList => {
        const filteredNodes = fuzzy
            .filter(pattern || '', nodeList, fuzzOptions)
            .map(e => e.string)
        if (!pattern && defaultItem) {
            filteredNodes.unshift(defaultItem)
        }
        return filteredNodes
    })
    return filterPromise
}

class InquirerFuzzyRushProjects extends InquirerAutocomplete {
    constructor(question, rl, answers) {
        const {} = question
        const questionBase = Object.assign({}, question, {
            source: (_, pattern) =>
                getRushProjects(pattern, question.default, question.exclude),
        })
        super(questionBase, rl, answers)

        this.initialSearchText = question.searchText;

        if (question.searchText !== undefined) {
            // search for something immediately
            this.firstRender = false
            rl.write(ansiEscapes.cursorForward(question.searchText.length + 10))
            rl.line = question.searchText
            this.render()

            this.search(question.searchText)
        }
    }

    search(searchTerm) {
        if (this.initialSearchText !== undefined && searchTerm === null) {
            return
        }

        return super.search(searchTerm).then(() => {
            this.currentChoices.getChoice = choiceIndex => {
                const choice = Choices.prototype.getChoice.call(
                    this.currentChoices,
                    choiceIndex
                )
                return {
                    value: stripAnsi(choice.value),
                    name: stripAnsi(choice.name),
                    short: stripAnsi(choice.name),
                }
            }
        })
    }

    onSubmit(line) {
        super.onSubmit(stripAnsi(line))
    }
}

module.exports = {
    InquirerFuzzyRushProjects,
    listNodes,
    getRushProjects,
}
