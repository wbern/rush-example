const inquirer = require('inquirer')
const { InquirerFuzzyRushProjects } = require('./prompt.js')

const questionResponses = require('./question-responses.js')
const questions = require('./questions.js')

inquirer.registerPrompt('fuzzypath', InquirerFuzzyRushProjects)

var { Observable, Subject } = require('rxjs')

let emitter

const store = {
    items: [],
}

// initialize
var prompts = Observable.create(function(e) {
    emitter = e
    // start off by asking what packages to add.
    // might not make sense later when we load saved or try to predict answers
    console.clear();
    emitter.next(questions['add-items-question'](store.items))
})

// handle submitted answers (probably by creating new questions)
inquirer.prompt(prompts).ui.process.subscribe(
    q => {
        console.clear();
        questionResponses[q.name + '-response'](q, emitter, store.items)
    },
    error => {
        throw error
    },
    complete => {
        console.log('Finished!')
    }
)
