const inquirer = require('inquirer')
const { InquirerFuzzyRushProjects } = require('./prompt.js')

const responseHandler = require('./response-handler.js')
const questionGenerator = require('./question-generator.js')

inquirer.registerPrompt('fuzzypath', InquirerFuzzyRushProjects)

var { Observable, Subject } = require('rxjs')

let emitter

let addedProjectScripts = []

// initialize
var prompts = Observable.create(function(e) {
    emitter = e
    // start off by asking what packages to add.
    // might not make sense later when we load saved or try to predict answers
    emitter.next(questionGenerator['add-item'](addedProjectScripts))
})

// handle submitted answers (probably by creating new questions)
inquirer.prompt(prompts).ui.process.subscribe(
    q => {
        responseHandler[q.name](q, emitter, addedProjectScripts)
    },
    error => {
        throw error
    },
    complete => {
        console.log('Finished!')
    }
)
