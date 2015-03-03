module.exports = {
    name: undefined,

    lists : {
        global: { name: 'global', priority:0, members: new Object },
        blacklist: { name: 'blacklist', priority: 1, members: new Object },
        whitelist: { name: 'whitelist', priority: 0.9, members: new Object }
    },

    policies: new Object
}
