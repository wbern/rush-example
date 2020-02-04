const questionGenerator = require('./question-generator.js')
const { serializeProjectsAndScripts } = require('./lib.js')

module.exports = {
    status: (q, emitter, addedProjectScripts) => {
        switch (q.answer) {
            case 'start':
                emitter.complete()
                break
            case 'add-item':
                emitter.next(questionGenerator['add-item'](addedProjectScripts))
                break
            case 'edit-items':
                emitter.next({
                    type: 'checkbox',
                    message:
                        'Deselect any script you no longer wish to run, then press enter',
                    name: 'edit-items',
                    choices: [
                        // new inquirer.Separator("Category here"),
                        ...addedProjectScripts.map(name => ({
                            name,
                            checked: false,
                        })),
                    ],
                })
                break
            case 'remoove-item':
                emitter.next({
                    type: 'list',
                    name: 'remove-item',
                    message:
                        'Select a build script you no longer wish to execute, and press enter',
                    choices: [
                        // new inquirer.Separator("Category here"),
                        ...addedProjectScripts.map(name => ({
                            name,
                        })),
                    ],
                })
                break
            default:
                throw new Error('not implemented')
        }
    },
    'add-item': (q, emitter, addedProjectScripts) => {
        // added a new item to the list
        if (q.answer) {
            q.answer.forEach(answer => addedProjectScripts.push(answer))
        }

        console.log(addedProjectScripts.join(', '))

        serializeProjectsAndScripts(addedProjectScripts).then(
            itemsLeftToAdd => {
                if (q.answer) {
                    emitter.next(
                        questionGenerator['add-item'](addedProjectScripts)
                    )
                } else {
                    emitter.next(
                        questionGenerator.status(addedProjectScripts, {
                            canAdd:
                                addedProjectScripts.length === 0 ||
                                itemsLeftToAdd.length > 0,
                        })
                    )
                }
            }
        )
    },
    'edit-items': (q, emitter, addedProjectScripts) => {
        addedProjectScripts = addedProjectScripts.filter(
            item => !q.answer.includes(item)
        )
        emitter.next(questionGenerator.status(addedProjectScripts))
    },
    'remove-item': (q, emitter, addedProjectScripts) => {
        addedProjectScripts = addedProjectScripts.filter(
            item => item !== q.answer
        )
        emitter.next(questionGenerator.status(addedProjectScripts))
    },
    quit: (q, emitter, addedProjectScripts) => {
        process.exit(0)
    },
}
