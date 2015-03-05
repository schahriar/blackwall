var _ = require("lodash");
module.exports = {
    name: "express",
    framework: true,

    create: function() {
        var _this = this;

        return function(req, res, next) {
            // Perhaps in future versions Blackwall could request for all ips in one go
            _this.session((_.first(req.ips) || req.ip), function(error, hasAccess) {
                if(error) res.status(500).end(); // Add error reporting in development env

                if(hasAccess === true) next();
                else res.status(503).end();
            })
        }
    },
}
