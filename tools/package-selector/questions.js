var emoji = require('node-emoji')

module.exports = {
    'main-menu-question': (items = [], options = {}) => ({
        name: 'main-menu-question',
        type: 'list',
        message:
            'Scripts scheduled to run:\n' +
            items
                .map(
                    project =>
                        /*emoji.get('package') + ' ' + */ project.displayName +
                        '\n'
                )
                .join('') +
            '\nWhat next?',
        default: items.length > 0 ? 'y' : 'a',

        choices: [
            {
                key: 's',
                name: 'Run the scripts',
                value: 'request:start',
            },
            {
                key: 'a',
                name: 'Add pre-scripts to execute and complete before the other scripts.',
                value: 'request:add-pre-items',
            },
            {
                key: 'a',
                name: 'Add scripts to the list for continous execution.',
                value: 'request:add-items',
            },
            {
                key: 'e',
                name: 'Remove one or more currently listed scripts',
                value: 'request:edit-items',
            },
            {
                key: 'd',
                name: 'Remove single script from the list',
                value: 'request:remove-item',
            },
            {
                key: 'q',
                name: 'Quit',
                value: 'request:quit',
            },
        ].filter(({ value }) => {
            if (value === 'request:add-items' && options.canAdd === false) {
                return false
            } else if (
                value === 'request:edit-items' &&
                (items.length === 0 || options.canEdit === false)
            ) {
                return false
            } else if (
                value === 'request:remove-item' &&
                (items.length === 0 || options.canRemove === false)
            ) {
                return false
            } else if (
                value === 'request:start' &&
                (items.length === 0 || options.canStart === false)
            ) {
                return false
            }
            return true
        }),
    }),
    'add-pre-items-question': (exclude = []) => ({
        type: 'fuzzypath',
        name: 'add-pre-items-question',
        message:
            "Search for scripts to execute and complete, before the other scripts.",
        exclude,
        suggestOnly: false,
        // custom options
        pre: true,
    }),
    'add-items-question': (exclude = []) => ({
        type: 'fuzzypath',
        name: 'add-items-question',
        message:
            "Search for scripts to run continously.",
        exclude,
        // default: "",
        suggestOnly: false,
        // suggestOnly :: Bool
        // Restrict prompt answer to available choices or use them as suggestions
    }),
    'remove-items-question': items => ({
        type: 'checkbox',
        name: 'remove-items-question',
        message:
            'Select any script you no longer wish to run (press space), then press enter',
        choices: [
            // new inquirer.Separator("Category here"),
            ...items.map(value => ({
                name: value.displayName,
                value,
                checked: false,
            })),
        ],
    }),
    'remove-item-question': items => ({
        type: 'list',
        name: 'remove-item-question',
        message:
            'Select a build script you no longer wish to execute, and press enter',
        choices: [
            // new inquirer.Separator("Category here"),
            ...items.map(item => ({
                name: item.displayName,
            })),
        ],
    }),
}
