module.exports = {
    name: "custom",
    framework: true,

    inbound: function(options) {
        var _this = this;

        return function(ip, end, callback) {
            // Perhaps in future versions Blackwall could request for all ips in one go
            _this.session(ip, function(error, hasAccess) {
                // Add error as first argument
                if(hasAccess === true) callback(error);
                else end();
            })
        }
    },
}
