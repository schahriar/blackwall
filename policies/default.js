module.exports = {
    name: 'default',

    lists : {
        global: { name: 'global', members: new Object },
        blacklist: { name: 'blacklist', members: new Object },
        whitelist: { name: 'whitelist', members: new Object }
    },

    rules: {
        global: {
            rate: { d:undefined, h:undefined, m:30 },
            block: false
        },
        blacklist: {
            rate: { d:0, h:undefined, m:undefined },
            block: true
        },
        whitelist: {
            rate: { d:undefined, h:undefined, m:120 },
            block: false
        }
    }
}
