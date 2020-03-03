var emoji = require('node-emoji')

module.exports = {
    status: (addedProjectScripts = [], options = {}) => ({
        name: 'status',
        type: 'list',
        message:
            'Scripts scheduled to run:\n' +
            addedProjectScripts
                .map(
                    project =>
                        emoji.get('package') + ' ' + project.displayName + '\n'
                )
                .join('') +
            '\nWhat next?',
        default: addedProjectScripts.length > 0 ? 'y' : 'a',

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
            if (value === 'add-item' && options.canAdd === false) {
                return false
            } else if (
                value === 'edit-items' &&
                (addedProjectScripts.length === 0 || options.canEdit === false)
            ) {
                return false
            } else if (
                value === 'remove-item' &&
                (addedProjectScripts.length === 0 ||
                    options.canRemove === false)
            ) {
                return false
            } else if (
                value === 'start' &&
                (addedProjectScripts.length === 0 || options.canStart === false)
            ) {
                return false
            }
            return true
        }),
    }),
    'add-item': (exclude = []) => ({
        type: 'fuzzypath',
        name: 'add-item',
        message:
            "Select a package you'd like to add for execution, or select go back.",
        exclude,
        // default: "",
        suggestOnly: false,
        // suggestOnly :: Bool
        // Restrict prompt answer to available choices or use them as suggestions
    }),
}
