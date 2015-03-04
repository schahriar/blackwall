var chai = require("chai");
var BlackWall = require("./blackwall");
var inspect = require("util").inspect;

var _ = require("lodash");

var should = chai.should();
var expect = chai.expect;

var firewall = new BlackWall();
var policies = firewall.policy;

var ipv6 = {
    valid: "2001:0db8::0001",
    validAlt: "fdb3:837:c302::48",
    expanded: "2001:db8:0:0:0:0:0:1",
    invalid: "4001:0db8:::0001"
}

var list = {
    valid: "global",
    ALLed: "global",
    invalid: "DNE",
    case: "blackList"
}

var rules = {
    basic: { rate: { d:0, h:undefined, m:undefined }, block: false },
}

describe('BlackWall Test Suite', function(){
	describe('Member & list management checks', function(){
		it('should add member to specified list', function(){
            // Add member
            firewall.addMember(list.valid,ipv6.expanded);
            // Check for member
            expect(policies.lists[list.valid].members[ipv6.expanded]).to.be.an('Object');
		})
        it('should allow * assignment', function(){
            // Check for member
            expect(firewall.admit(ipv6.validAlt)).to.be.true;
		})
        it('should expand ipv6 members when added to specified list', function(){
            // Add member
            firewall.addMember(list.valid,ipv6.valid);
            // Check for member
            expect(policies.lists[list.valid].members[ipv6.expanded]).to.be.an('Object');
		})
        it('should return an error when users are added to non-existent list', function(){
            // Add member
            expect(firewall.addMember(list.invalid,ipv6.expanded)).to.have.property('error');
		})
        it('should return an error with invalid ip addresses', function(){
            // Add member
            expect(firewall.addMember(list.valid,ipv6.invalid)).to.have.property('error');
		})
        it('should store all lists as lowercase', function(){
            // Add list
            firewall.addList(list.case, rules.basic, 0.5);
            // Expect lowercase
            expect(policies.lists[list.case.toLowerCase()]).to.have.property('name').equal(list.case.toLowerCase());
		})
        it('should return an error for duplicate lists', function(){
            // Add list
            expect(firewall.addList(list.case, rules.basic, 0.5)).to.have.property('error');
		})
        it('should not return an error for duplicate lists when forced', function(){
            // Add list
            expect(firewall.addList(list.case, rules.basic, 0.5, true)).to.not.have.property('error');
		})
	})
});
