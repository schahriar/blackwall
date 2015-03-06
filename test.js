var chai = require("chai");
var BlackWall = require("./blackwall");
var inspect = require("util").inspect;
var http = require('http');
var net = require('net');
var express = require('express');

var _ = require("lodash");

var should = chai.should();
var expect = chai.expect;

var firewall = new BlackWall();
var policies = firewall.policy;

// Set global per sec rule to <= 10
policies.rules.global.rate.s = 10;

var ipv6 = {
    valid: "2001:0db8::0001",
    validAlt: "fdb3:837:c302::48",
    expanded: "2001:db8:0:0:0:0:0:1",
    invalid: "4001:0db8:::0001"
}

var ipv4 = {
    loop: function(i) {
        return "188.88." + Math.floor(i/255) + "." + i%255;
    }
}

var list = {
    valid: "global",
    ALLed: "global",
    invalid: "DNE",
    case: "blackList"
}

var rules = {
    basic: { rate: { d:0, h:undefined, m:undefined }, block: false },
    modified: { rate: { d:undefined, h:600, m:undefined }, block:false },
    whitelist: { whitelist: true }
}

/// Express Server
var app = express();

// Allow ip address spoofing for testing purposes
app.use(function(req,res,next) {
    if(req.query.address) req.overrideip = (req.query.address);
    next();
})

// Unsafe allows for overriding ip address
app.use(firewall.enforce("express", { unsafe: true }));

app.get('/', function (req, res) { res.send('Hello World!') })
app.listen(3000);
///

/// TCP Server
var server = net.createServer(function(socket) {
    firewall.enforce()(
        socket.remoteAddress,
        function() { socket.end("FIREWALL"); },
        function() { socket.write('connected'); }
    )
});
server.listen(3100);
///

describe('BlackWall Test Suite', function(){
	describe('Member & list management checks', function(){
		it('should add member to specified list', function(){
            // Add member
            firewall.addMember(list.valid,ipv6.expanded);
            // Check for member
            expect(policies.lists[list.valid].members[ipv6.expanded]).to.be.an('Object');
		})
        it('should allow mass member additions (3000 ipv4s)', function(){
            // Add 3000 members
            for(i=0; i<3000; i++) firewall.addMember(list.valid,ipv4.loop(i));
            // Check for member
            expect(Object.keys(policies.lists[list.valid].members).length).to.be.at.least(3000);
		})
        it('should allow mass member removals (2900 ipv4s)', function(){
            // Remove 2900 members
            for(i=0; i<2900; i++) firewall.removeMember(list.valid,ipv4.loop(i));
            // Check for member
            expect(Object.keys(policies.lists[list.valid].members).length).to.be.below(200);
		})
        it('should allow * assignment', function(done){
            // Check for member
            firewall.session(ipv6.validAlt, function(error, access) {
                expect(access).to.be.true;
                done();
            })
		})
        it('should expand ipv6 members when added to specified list', function(){
            // Add member
            firewall.addMember(list.valid,ipv6.valid);
            // Check for member
            expect(policies.lists[list.valid].members[ipv6.expanded]).to.be.an('Object');
		})
        it('should return an error when users are added to non-existent list', function(){
            // Add member
            expect(function() { firewall.addMember(list.invalid,ipv6.expanded) }).to.throw(Error);
		})
        it('should return an error with invalid ip addresses', function(){
            // Add member
            expect(function() { firewall.addMember(list.valid,ipv6.invalid) }).to.throw("Invalid ip address!");
		})
        it('should store all lists as lowercase', function(){
            // Add list
            firewall.addList(list.case, rules.basic, 0.5, false, true);
            // Expect lowercase
            expect(policies.lists[list.case.toLowerCase()]).to.have.property('name').equal(list.case.toLowerCase());
		})
        it('should return an error for duplicate lists', function(){
            // Add list
            expect(function() { firewall.addList(list.case, rules.basic, 0.5) }).to.throw(Error);
		})
        it('should not return an error for duplicate lists when forced', function(){
            // Add list
            expect(function() { firewall.addList(list.case, rules.basic, 0.5, false, true) }).to.not.throw(Error);
		})
        it('should modify rules correctly', function(){
            // Modify rule
            expect(firewall.modifyRule(list.case, rules.modified, false)).to.be.equal(rules.modified);
		})
        it('should remove lists', function(){
            // Remove list
            firewall.removeList(list.case)
            expect(policies.lists[list.case.toLowerCase()]).to.be.undefined;
		})
	})

    describe('ExpressJS firewall checks', function(){
        this.timeout(5000);
		it('should allow on first call', function(done){
            http.get('http://localhost:3000', function (res) {
                res.statusCode.should.equal(200);
                done();
            });
		})
        it('should deny over 10 calls a second [defined rule]', function(done){
            for(i=0; i<10; i++) http.get('http://localhost:3000');
            http.get('http://localhost:3000', function (res) {
                res.statusCode.should.equal(503);
                done();
            });
		})
        it('should allow < 10 calls after a second', function(done){
            setTimeout(function(){
                for(i=0; i<4; i++) http.get('http://localhost:3000');
                http.get('http://localhost:3000', function (res) {
                    res.statusCode.should.equal(200);
                    done();
                });
            }, 1200);
		})
    });

    describe('TCP firewall checks', function(){
        this.timeout(10000);
		it('should allow on first call', function(done){
            net.connect({port: 3100}).on('data', function(data) {
                data.toString().should.equal('connected');
                done();
            })
		})
        it('should deny over 10 calls a second [defined rule]', function(done){
            for(c=0; c<10; c++) net.connect({port: 3100});
            net.connect({port: 3100}).on('close', function(had_error) {
                expect(had_error).to.be.false;
                done();
            })
		})
        it('should allow < 10 calls after a second', function(done){
            setTimeout(function(){
                for(i=0; i<4; i++) net.connect({port: 3100});
                net.connect({port: 3100}).on('data', function(data) {
                    data.toString().should.equal('connected');
                    done();
                })
            }, 1200);
		})
    });

    describe('Whitelist ip firewall checks', function(){
        this.timeout(5000);
		it('should allow on first call', function(done){
            http.get('http://localhost:3000/?address=240.24.24.24', function (res) {
                res.statusCode.should.equal(200);
                done();
            });
		})
        it('should not allow after whitelisting', function(done){
            // Create a whitelist
            firewall.addList("whitelist", rules.whitelist, 1, false);

            http.get('http://localhost:3000/?address=240.24.24.24', function (res) {
                res.statusCode.should.equal(503);
                done();
            });
		})
        it('should allow listed members after whitelisting', function(done){
            // Whitelist 240.24.24.200 only
            firewall.addMember("whitelist", "240.24.24.200");

            http.get('http://localhost:3000/?address=240.24.24.200', function (res) {
                res.statusCode.should.equal(200);
                done();
            });
		})
    });
});
