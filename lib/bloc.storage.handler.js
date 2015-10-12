var _ = require('lodash');

module.exports = function(storage) {
	return {
		get: function(query, callback) {
			if(!_.has(storage, query.key)) return callback(null, undefined);
			var result = _.get(storage, query.key);
			// If Query.limit is a Number return a limited number of Array
			if(_.isNumber(query.limit) && _.isArray(result)) {
				result = _.slice(result, result.length - query.limit, result)
			}
			callback(null, result);
		},
		set: function(query, callback) {
			callback(null, _.set(storage, query.key, query.value));
		},
		list: function(callback) {
			callback(null, Object.keys(storage));
		},
		length: function(callback) {
			callback(null, _.size(storage));
		}
	}
}