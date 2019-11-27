const inquirer = require('inquirer')
const { InquirerFuzzyRushProjects, listNodes } = require('./lib.js')

inquirer.registerPrompt('fuzzypath', InquirerFuzzyRushProjects)

var { Observable, Subject } = require('rxjs')

let emitter

let createStatusQuestion = (things = ['[nothing]'], canAdd = true) => ({
    name: 'status',
    type: 'list',
    message:
        'Will execute following:\n' +
        things.map(t => '    * ' + t + '\n').join('') +
        '\nWhat next?',
    default: things.length > 0 ? 'y' : 'a',
    // when: (answers) => {
    //   if (answers.bla) {
    //     return false;
    //   } else {
    //     return true;
    //   }
    // },
    choices: [
        {
            key: 's',
            name: 'Run the scripts',
            value: 'start',
        },
        {
            key: 'a',
            name: 'Add one or more package scripts to the list',
            value: 'add-item',
        },
        {
            key: 'e',
            name: 'Remove one or more currently listed package scripts',
            value: 'edit-items',
        },
        {
            key: 'd',
            name: 'Remove single package script from the list',
            value: 'remove-item',
        },
        {
            key: 'q',
            name: 'Quit',
            value: 'quit',
        },
    ].filter(({ value }) => {
        if (value === 'add-item' && canAdd === false) {
            return false
        } else if (value === 'edit-items' && selectedItems.length === 0) {
            return false
        } else if (value === 'remove-item' && selectedItems.length === 0) {
            return false
        } else if (value === 'start' && selectedItems.length === 0) {
            return false
        }
        return true
    }),
})

let selectedItems = []

var prompts = Observable.create(function(e) {
    emitter = e
    // emitter.next(
    //     createStatusQuestion(
    //         selectedItems,
    //         selectedItems.length === 0 || listNodes(selectedItems).length > 0
    //     )
    // )
    emitter.next(createAddQuestion(selectedItems))
})

const createAddQuestion = (exclude = []) => ({
    type: 'fuzzypath',
    name: 'add-item',
    message:
        "Select a package you'd like to add for execution, or select go back.",
    exclude,
    // default: "",
    suggestOnly: false,
    // suggestOnly :: Bool
    // Restrict prompt answer to available choices or use them as suggestions
})

inquirer.prompt(prompts).ui.process.subscribe(
    q => {
        if (q.name === 'status') {
            if (q.answer === 'start') {
                console.log('ok, have fun!')
                emitter.complete()
            } else if (q.answer === 'add-item') {
                emitter.next(createAddQuestion(selectedItems))
            } else if (q.answer === 'edit-items') {
                emitter.next({
                    type: 'checkbox',
                    message:
                        'Deselect any script you no longer wish to run, then press enter',
                    name: 'edit-items',
                    choices: [
                        // new inquirer.Separator("Category here"),
                        ...selectedItems.map(name => ({
                            name,
                            checked: true,
                        })),
                    ],
                    // validate: function(answer) {
                    //   if (answer.length < 1) {
                    //     return "You must choose at least one topping.";
                    //   }
                    //   return true;
                    // }
                })
            } else if (q.answer === 'remove-item') {
                emitter.next({
                    type: 'list',
                    name: 'remove-item',
                    message:
                        'Select a build script you no longer wish to execute, and press enter',
                    choices: [
                        // new inquirer.Separator("Category here"),
                        ...selectedItems.map(name => ({
                            name,
                        })),
                    ],
                })
            } else {
                throw new Error('not implemented')
            }
        } else if (q.name === 'add-item') {
            // added a new item to the list
            if (q.answer !== '[go back]') {
                selectedItems.push(q.answer)
            }

            console.log(selectedItems.join(', '))

            listNodes(selectedItems).then(itemsLeftToAdd => {
                if (q.answer === '[go back]') {
                    emitter.next(
                        createStatusQuestion(
                            selectedItems,
                            selectedItems.length === 0 ||
                                itemsLeftToAdd.length > 0
                        )
                    )
                } else {
                    emitter.next(createAddQuestion(selectedItems))
                }
            })
        } else if (q.name === 'edit-items') {
            selectedItems = selectedItems.filter(item =>
                q.answer.includes(item)
            )
            emitter.next(createStatusQuestion(selectedItems))
        } else if (q.name === 'remove-item') {
            selectedItems = selectedItems.filter(item => item !== q.answer)
            emitter.next(createStatusQuestion(selectedItems))
        } else if (q.name === 'quit') {
            process.exit(0)
        }
    },
    error => {
        console.log('error')
    },
    complete => {
        console.log('complete')
    }
)

// prompts.onNext(makePrompt());

// prompts.complete();

// let createSearchQuestion = () => [
//   {
//     type: "fuzzypath",
//     name: "path",
//     message: "Select a package you'd like to add for execution.",
//     // default: "",
//     suggestOnly: false
//     // suggestOnly :: Bool
//     // Restrict prompt answer to available choices or use them as suggestions
//   }
// ];

// const startPrompt = () =>
//   inquirer.prompt([
//     {
//       name: "bla",
//       type: "expand",
//       message: "Bla\nBla\nbla\n\nReady to start?",
//       default: "y",
//       // when: (answers) => {
//       //   if (answers.bla) {
//       //     return false;
//       //   } else {
//       //     return true;
//       //   }
//       // },
//       default: "y",
//       choices: [
//         {
//           key: "y",
//           name: "Start",
//           value: "start"
//         },
//         {
//           key: "a",
//           name: "Add package to the list",
//           value: "add"
//         },
//         {
//           key: "e",
//           name: "Edit listed packages",
//           value: "edit"
//         },
//         {
//           key: "q",
//           name: "Quit",
//           value: "quit"
//         }
//       ]
//     }
//   ]);

// startPrompt();
