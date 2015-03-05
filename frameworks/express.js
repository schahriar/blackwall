var _ = require("lodash");
module.exports = {
    name: "express",
    framework: true,

    create: function() {
        var _this = this;

        return function(req, res, next) {
            // Perhaps in future versions Blackwall could request for all ips in one go
            _this.session((_.first(req.ips) || req.ip), function(hasAccess) {
                if(hasAccess === true) next();
                else res.status(503).end();
            })
        }
    },
}
