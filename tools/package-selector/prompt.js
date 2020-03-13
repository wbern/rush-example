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
const { Utilities } = require('@microsoft/rush-lib/lib/utilities/Utilities')

const { JsonFile, FileSystem } = require('@microsoft/node-core-library')
const {
    CommandLineConfiguration,
} = require('@microsoft/rush-lib/lib/api/CommandLineConfiguration')
const {
    PackageChangeAnalyzer,
} = require('@microsoft/rush-lib/lib/logic/PackageChangeAnalyzer')

const rushConfig = RushConfiguration.loadFromDefaultLocation()

packageChangeAnalyzer = new PackageChangeAnalyzer(rushConfig)

function _areShallowEqual(object1, object2) {
    for (const n in object1) {
        if (!(n in object2) || object1[n] !== object2[n]) {
            console.debug(
                `Found mismatch: "${n}": "${object1[n]}" !== "${object2[n]}"`
            )
            return false
        }
    }
    for (const n in object2) {
        if (!(n in object1)) {
            console.debug(
                `Found new prop in obj2: "${n}" value="${object2[n]}"`
            )
            return false
        }
    }
    return true
}

isPackageUnchanged = (rushProject, commandToRun) => {
    const packageDepsFilename = Utilities.getPackageDepsFilenameForCommand(
        commandToRun
    )

    const currentDepsPath = path.join(
        rushProject.projectRushTempFolder,
        packageDepsFilename
    )

    const currentPackageDeps = packageChangeAnalyzer.getPackageDepsHash(
        rushProject.packageName
    )

    if (FileSystem.exists(currentDepsPath)) {
        try {
            lastPackageDeps = JsonFile.load(currentDepsPath)
        } catch (e) {
            // Warn and ignore - treat failing to load the file as the project being not built.
            console.log(
                `Warning: error parsing ${this._packageDepsFilename}: ${e}. Ignoring and ` +
                    `treating the command "${this._commandToRun}" as not run.`
            )
        }
    }

    return !!(
        lastPackageDeps &&
        currentPackageDeps &&
        currentPackageDeps.arguments === lastPackageDeps.arguments &&
        _areShallowEqual(currentPackageDeps.files, lastPackageDeps.files)
    )
}

// const readdir = util.promisify(fs.readdir);

const separator = ' -> '

var runAsync = require('run-async')

function mapRushProjectsAndTheirScripts(excludeItems = []) {
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
                let unchanged = isPackageUnchanged(project, scriptName)

                let qualifiedName =
                    (unchanged ? '' : style.yellow.open) +
                    project.packageName +
                    separator +
                    scriptName +
                    (unchanged ? '' : style.yellow.close)

                rushChoices.push({
                    name: qualifiedName,
                    short: qualifiedName,
                    value: {
                        type: 'rush-project',
                        project: project,
                        projectName: project.packageName,
                        scriptName,
                        displayName: qualifiedName,
                    },
                })
            }
        })
    )

    return rushChoices
}

function mapRushCommandsForProjects(excludeItems = []) {
    let choices = []

    // list all the projects and their respective scripts
    rushConfig.projects.forEach(project => {
        if (
            !excludeItems.some(
                p =>
                    p.type === 'rush-project-command' &&
                    p.project.name === project.name
            )
        ) {
            let qualifiedName =
                project.packageName +
                separator +
                'rush build --to ' +
                project.packageName

            choices.push({
                name: qualifiedName,
                short: qualifiedName,
                value: {
                    type: 'rush-project-command',
                    project: project,
                    projectName: project.packageName,
                    name: 'build --to ' + project.packageName,
                    commandName: 'rush build --to ' + project.packageName,
                    displayName: qualifiedName,
                },
            })
        }
    })

    return choices
}

function mapRushCommands(excludeItems = []) {
    let choices = []

    let { commands } = CommandLineConfiguration.loadFromFileOrDefault(
        path.join(rushConfig.commonRushConfigFolder, 'command-line.json')
    )

    // add some rush specific commands...
    commands.push({
        commandKind: 'rush-command',
        name: 'update',
        commandName: 'rush update',
        displayName: 'rush ' + separator + 'update',
    })

    commands.forEach(command => {
        let qualifiedName =
            'rush command' +
            separator +
            command.name +
            ' (' +
            command.commandKind +
            ')'

        if (excludeItems.every(c => c.displayName !== qualifiedName)) {
            choices.push({
                name: qualifiedName,
                short: qualifiedName,
                value: {
                    type: 'rush-command',
                    command,
                    commandName: 'rush ' + command.name,
                    displayName: qualifiedName,
                },
            })
        }
    })

    return choices
}

function filterChoices(rushChoices, filterText, defaultItem) {
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
            source: async (_, pattern) => {
                let choices = []

                choices = choices.concat(
                    mapRushProjectsAndTheirScripts(question.exclude)
                )

                // if(this.pre) {
                choices = choices.concat(mapRushCommands(question.exclude))

                choices = choices.concat(
                    mapRushCommandsForProjects(question.exclude)
                )
                // }

                return filterChoices(choices, pattern, question.default)
            },
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

        const prefix = 'shell command'
        const appendingTotal = prefix + separator + searchTerm

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
