module.exports = {
    name: 'default',

    lists : {
        global: { name: 'global', priority:0, members: new Object },
        blacklist: { name: 'blacklist', priority: 1, members: new Object },
        whitelist: { name: 'whitelist', priority: 0.9, members: new Object }
    },

    rules: {
        global: {
            rate: { d:undefined, h:undefined, m:undefined, s:30 },
            block: false
        },
        blacklist: {
            rate: { d:0, h:undefined, m:undefined, s:undefined },
            block: true
        },
        whitelist: {
            rate: { d:undefined, h:undefined, m:undefined, s:120 },
            block: false
        }
    }
}
