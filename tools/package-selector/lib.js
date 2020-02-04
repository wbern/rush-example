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

const separator = ' -> '

var runAsync = require('run-async')

async function serializeProjectsAndScripts(projectScriptsToExclude) {
    let scripts = ['[go back]']

    rushConfig.projects.forEach(project =>
        Object.keys(project.packageJson.scripts || {}).forEach(scriptName => {
            if (
                projectScriptsToExclude.every(
                    p =>
                        p.project.packageName !== project.packageName ||
                        p.scriptName !== scriptName
                )
            ) {
                scripts.push(project.packageName + separator + scriptName)
            }
        })
    )

    return scripts
}

function deserializeProjectsAndScripts(lines) {
    let projects = []

    if (!Array.isArray(lines)) {
        throw new Error('invalid answer object')
    }

    lines.forEach(line => {
        let projectName = line.split(separator)[0]
        let scriptName = line
            .split(separator)
            .slice(1)
            .join(separator)

        let project = rushConfig.projectsByName.get(projectName)

        if (project) {
            projects.push({ project, scriptName })
        }
    })

    return projects
}

function getRushProjects(pattern, defaultItem, excludeItems = []) {
    const fuzzOptions = {
        pre: style.green.open,
        post: style.green.close,
    }

    const nodes = serializeProjectsAndScripts(excludeItems)
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

        this.initialSearchText = question.searchText

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

        super.search(searchTerm).then(() => {
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

    // onSubmit(line, a, b, c) {
    //     // super.onSubmit(stripAnsi(line))
    //     super.onSubmit(deserializeProjectsAndScripts([stripAnsi(line)]))
    // }

    // override the base onSubmit function
    onSubmit(line) {
        var self = this
        if (typeof this.opt.validate === 'function' && this.opt.suggestOnly) {
            var validationResult = this.opt.validate(line)
            if (validationResult !== true) {
                this.render(
                    validationResult || 'Enter something, tab to autocomplete!'
                )
                return
            }
        }

        var choice = {}
        if (
            this.currentChoices.length <= this.selected &&
            !this.opt.suggestOnly
        ) {
            this.rl.write(line)
            this.search(line)
            return
        }

        if (this.opt.suggestOnly) {
            choice.value = line || this.rl.line
            this.answer = line || this.rl.line
            this.answerName = line || this.rl.line
            this.shortAnswer = line || this.rl.line
            this.rl.line = ''
        } else {
            choice = this.currentChoices.getChoice(this.selected)

            if (choice.value === '[go back]') {
                choice.value = null
            } else {
                choice.value = deserializeProjectsAndScripts([
                    stripAnsi(choice.value),
                ])
            }

            this.answer = choice.value
            this.answerName = choice.name
            this.shortAnswer = choice.short
        }

        runAsync(this.opt.filter, function(err, value) {
            choice.value = value
            self.answer = value

            if (self.opt.suggestOnly) {
                self.shortAnswer = value
            }

            self.status = 'answered'
            // Rerender prompt
            self.render()
            self.screen.done()
            self.done(choice.value)
        })(choice.value)
    }
}

module.exports = {
    InquirerFuzzyRushProjects,
    serializeProjectsAndScripts,
    getRushProjects,
}
