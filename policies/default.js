module.exports = {
    name: 'default',
    blackList: { name: 'blackList', members: new Object },
    whiteList: { name: 'whiteList', members: new Object },

    rules: {
        global: {
            rate: { d:undefined, h:undefined, m:30 }
        }
        blackList: {
            rate: { d:0, h:undefined, m:undefined }
        },
        whiteList: {
            rate: { d:undefined, h:undefined, m:120 }
        }
    }
}
