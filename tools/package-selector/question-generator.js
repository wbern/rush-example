var emoji = require('node-emoji')

module.exports = {
    status: (items = [], options) => ({
        name: 'status',
        type: 'list',
        message:
            'Preferences:\n' +
            '`rush update`: ' +
            (options.rushUpdateEnabled !== true ? 'Disabled' : 'Enabled') +
            '\n' +
            '`rush build`: ' +
            (options.rushBuildEnabled !== true ? 'Disabled' : 'Enabled') +
            '\n\n' +
            'Scripts scheduled to run:\n' +
            items.map(t => emoji.get('package') + ' ' + t + '\n').join('') +
            '\nWhat next?',
        default: items.length > 0 ? 'y' : 'a',

        choices: [
            {
                key: 's',
                name: 'Run the scripts',
                value: 'start',
            },
            options.rushUpdateEnabled !== true
                ? {
                      key: 'u',
                      name: 'Enable `rush update` before script execution',
                      value: 'rush-update-enable',
                  }
                : {
                      key: 'u',
                      name:
                          'Disable running `rush update` before script execution',
                      value: 'rush-update-disable',
                  },
            options.rushBuildEnabled !== true
                ? {
                      key: 'b',
                      name: 'Enable `rush build` before script execution',
                      value: 'rush-build-enable',
                  }
                : {
                      key: 'b',
                      name:
                          'Disable running `rush build` before script execution',
                      value: 'rush-build-disable',
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
                (items.length === 0 || options.canEdit === false)
            ) {
                return false
            } else if (
                value === 'remove-item' &&
                (items.length === 0 || options.canRemove === false)
            ) {
                return false
            } else if (
                value === 'start' &&
                (items.length === 0 || options.canStart === false)
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
