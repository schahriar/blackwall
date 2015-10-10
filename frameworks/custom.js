module.exports = {
    name: "custom",
    framework: true,

    inbound: function(policy, options) {
        var _this = this;

        return function(ip, end, callback) {
            var session = _this.session(ip, {
                ip: ip
            });
            // Handle Express Errors better
            if(session.constructor === Error) {
                return end(session.message);
            }
            session.on('terminate', function(reason) {
                end(reason);
            })
            _this.assign(session, policy);
            if(session.terminated) return end();
        }
    },
}
