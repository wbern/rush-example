const questions = require('./questions.js')

module.exports = {
    'main-menu-question-response': (response, emitter, items) => {
        switch (response.answer) {
            case 'request:start':
                emitter.complete()
                break
            case 'request:add-items':
                emitter.next(questions['add-items-question'](items))
                break
            case 'request:edit-items':
                emitter.next(questions['remove-items-question'](items))
                break
            case 'request:remove-item':
                emitter.next(questions['remove-item-question'](items))
                break
            case 'request:quit':
                process.exit(0)
                break
            default:
                throw new Error('not implemented')
        }
    },
    'add-items-question-response': (response, emitter, items) => {
        // added a new item to the list
        if (response.answer.type === 'rush-project') {
            items.push(response.answer)
        }

        // console.log(items.join(', '))

        if (response.answer.type !== 'cancel') {
            emitter.next(questions['add-items-question'](items))
        } else {
            emitter.next(
                questions['main-menu-question'](items, {
                    canAdd: true,
                    // canAdd:
                    //     items.length === 0 ||
                    //     itemsLeftToAdd.length > 0,
                })
            )
        }
    },
    'remove-items-question-response': (response, emitter, items) => {
        for (let i = 0; i < items.length; i++) {
            let toBeRemoved = response.answer.some(
                projectToRemove =>
                    projectToRemove.displayName === items[i].displayName
            )

            if (toBeRemoved) {
                items.splice(i, 1)
                i--
            }
        }

        emitter.next(questions['main-menu-question'](items))
    },
    'remove-item-question-response': (response, emitter, items) => {
        let removeIndex = items.findIndex(item => item.value === response)

        items.splice(removeIndex, 1)

        emitter.next(questions['main-menu-question'](items))
    },
}
