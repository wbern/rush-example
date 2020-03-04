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

async function mapRushProjects(filterText, defaultItem, excludeItems = []) {
    let rushChoices = []

    // list all the projects and their respective scripts
    rushConfig.projects.forEach(project =>
        Object.keys(project.packageJson.scripts || {}).forEach(scriptName => {
            if (
                !excludeItems.some(
                    p =>
                        p.type === 'rush-project' &&
                        p.project.packageName === project.packageName &&
                        p.scriptName === scriptName
                )
            ) {
                rushChoices.push({
                    name: project.packageName + separator + scriptName,
                    short: project.packageName + separator + scriptName,
                    value: {
                        type: 'rush-project',
                        project: project,
                        projectName: project.packageName,
                        scriptName,
                        displayName: project.packageName + ' -> ' + scriptName,
                    },
                })
            }
        })
    )

    // now filter based on search
    const filteredRushChoices =
        filterText === ''
            ? rushChoices
            : fuzzy
                  .filter(filterText || '', rushChoices, {
                      // fuzzy options
                      pre: style.green.open,
                      post: style.green.close,
                      extract: function(choice) {
                          return choice.name
                      },
                  })
                  .map(e => ({ ...e.original, name: e.string }))

    if (!filterText && defaultItem) {
        filteredRushChoices.unshift(defaultItem)
    }

    return filteredRushChoices
}

class InquirerFuzzyRushProjects extends InquirerAutocomplete {
    constructor(question, rl, answers) {
        // const {} = question
        const questionBase = Object.assign({}, question, {
            source: (_, pattern) =>
                mapRushProjects(pattern, question.default, question.exclude),
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

    updateCancelOption(searchTerm) {
        if (
            // searchTerm === null ||
            !this.currentChoices ||
            !Array.isArray(this.currentChoices.choices)
        ) {
            return
        }

        let choiceIndex = this.currentChoices.choices.findIndex(
            c => c.type === 'cancel'
        )

        let updatedChoice = {
            disabled: undefined,
            name: '[ Go back to main menu ]',
            short: '[ Go back to main menu ]',
            value: {
                type: 'cancel',
            },
        }

        if (choiceIndex === -1) {
            this.currentChoices.choices.splice(0, 0, updatedChoice)
            this.currentChoices.realChoices.splice(0, 0, {
                ...updatedChoice,
            })
        } else {
            this.currentChoices.choices[choiceIndex] = updatedChoice
            this.currentChoices.realChoices[choiceIndex] = {
                ...updatedChoice,
            }
        }
    }

    updateManualChoice(searchTerm) {
        if (
            searchTerm === null ||
            !this.currentChoices ||
            !Array.isArray(this.currentChoices.choices)
        ) {
            return
        }

        const prefix = 'shell command -> '
        const appendingTotal = prefix + searchTerm

        let currentManualChoiceIndex = this.currentChoices.choices.findIndex(
            c => c.name.startsWith(prefix)
        )

        let currentManualChoice = {
            disabled: undefined,
            name: appendingTotal,
            short: appendingTotal,
            value: {
                type: 'shell',
                command: searchTerm,
                displayName: appendingTotal,
            },
        }

        if (searchTerm === '') {
            if (currentManualChoiceIndex !== -1) {
                // cleanup
                this.currentChoices.choices.splice(currentManualChoiceIndex, 1)
                this.currentChoices.realChoices.splice(
                    currentManualChoiceIndex,
                    1
                )
            }
        } else if (currentManualChoiceIndex === -1) {
            // was not in list, add it
            this.currentChoices.choices.splice(1, 0, currentManualChoice)
            this.currentChoices.realChoices.splice(1, 0, {
                ...currentManualChoice,
            })
        } else {
            // in list, update it
            this.currentChoices.choices[
                currentManualChoiceIndex
            ] = currentManualChoice

            this.currentChoices.realChoices[currentManualChoiceIndex] = {
                ...currentManualChoice,
            }
        }
    }

    search(searchTerm) {
        if (this.initialSearchText !== undefined && searchTerm === null) {
            return
        }

        super
            .search(searchTerm)
            .then(() => {
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
            .then(() => {
                this.updateCancelOption(searchTerm)
                this.updateManualChoice(searchTerm)
                this.render()
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

            // if (choice.value && choice.value.type === 'shell') {
            //     // choice.value =
            // } else if (choice.value && choice.value.type === 'cancel') {
            //     choice.value = null
            // } else {
            //     choice.value = deserializeProjectsAndScripts([
            //         stripAnsi(choice.value),
            //     ])
            // }

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
}
