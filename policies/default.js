module.exports = {
    name: 'default',
    blacklist: { name: 'blacklist', members: new Object },
    whitelist: { name: 'whitelist', members: new Object },

    rules: {
        global: {
            rate: { d:undefined, h:undefined, m:30 }
        },
        blacklist: {
            rate: { d:0, h:undefined, m:undefined }
        },
        whitelist: {
            rate: { d:undefined, h:undefined, m:120 }
        }
    }
}
