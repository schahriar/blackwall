var chai = require("chai");
var BlackWall = require("./blackwall");
var inspect = require("util").inspect;
var http = require('http');
var net = require('net');
var express = require('express');

var _ = require("lodash");
var ipaddr = require('ipaddr.js');
var moment = require('moment');

var should = chai.should();
var expect = chai.expect;

var ipv6 = {
    valid: "2001:0db8::0001",
    validAlt: "fdb3:837:c302::48",
    expanded: "2001:db8:0:0:0:0:0:1",
    invalid: "4001:0db8:::0001"
}


var ipv4 = {
    loop: function(i) {
        return "188.88." + Math.floor(i/255) + "." + i%255;
    },
    blocked: "192.0.2.0",
    blockedRange: "10.53.66.200",
    valid: "198.51.100.0"
}

var firewall = new BlackWall();
var policy = firewall.addPolicy('test', [firewall.rules.blacklist, firewall.rules.rateLimiter], {
    rate: {
        s: 10,
        m: 60,
        h: 3000
    },
    blacklist: {
        address: [ipv4.blocked],
        range: ['10.0.0.0/8']
    }
});

if(policy.constructor === Error) throw policy;

/// Express Server
var app = express();

// Allow ip address spoofing for testing purposes
app.use(function(req,res,next) {
    if(req.query.address) req.overrideip = (req.query.address);
    next();
})

// Unsafe allows for overriding ip address
app.use(firewall.enforce("express", policy, { unsafe: true }));

app.get('/', function (req, res) { res.send('Hello World!') })
app.listen(3000);
///

describe('BlackWall Test Suite', function(){
    describe('Session & Member management checks', function(){
        it('should add member to specified list', function(){
            var session = firewall.session(ipv6.expanded, {
                ip: ipv6.expanded
            })
            // Add member
            firewall.assign(session, policy);
            // Check for member
            expect(policy.bloc.members[ipv6.expanded]).to.be.an('Object');
        })
        it('should allow mass member additions (3000 ipv4s)', function(){
            // Vulnerable to DoS attacks | Use a database store or some other method to store sessions //
            // Add 3000 members
            for(i=0; i<3000; i++) {
                firewall.assign(firewall.session(ipv4.loop(i), { ip: ipv4.loop(i) }), policy);
            }
            // Check for member
            expect(Object.keys(policy.bloc.members).length).to.be.at.least(3000);
        })
        it('should allow mass member removals (2995 ipv4s)', function(){
            // Remove 2995 members
            var count = 0;
            _.each(policy.bloc.members, function(member) {
                if(count>2995) return false;
                count++;
                policy.bloc.remove(member);
            })
            // Clean Keys
            policy.bloc.clean();
            // Check for member
            expect(Object.keys(policy.bloc.members).length).to.be.below(20);
        })
        it('should expand ipv6 members when added to specified list', function(){
            // Add member
            var session = firewall.session(ipv6.valid, { ip: ipv6.valid });
            // Assign To Policy
            firewall.assign(session, policy);
            // Check for member
            expect(policy.bloc.members[ipv6.expanded]).to.be.an('Object');
        })
        it('should return an error when sessions are assigned to non-existent policy', function(){
            // Add member
            var session = firewall.session(ipv6.validAlt, { ip: ipv6.validAlt });
            // Assign
            var result = firewall.assign(session, null);
            expect(result).to.be.an.instanceof(Error);
        })
    })

    describe('Framework checks', function(){
        this.timeout(5000);
        it('should run Express', function(done){
            http.get('http://localhost:3000', function (res) {
                res.statusCode.should.equal(200);
                done();
            });
        })
    });
});

describe('Predefined Rules Test Suite', function(){
    this.timeout(5000);
    describe('RateLimiter', function() {
        it('should allow initial connection', function(done) {
            http.get('http://localhost:3000', function (res) {
                res.statusCode.should.equal(200);
                done();
            });
        })
        it('should ignore if more than 10 connections are made within a second', function(done) {
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
    })
    describe('Blacklist', function() {
        it('should block a blacklisted ip', function(done) {
            http.get('http://localhost:3000?address=' + ipv4.blocked, function (res) {
                res.statusCode.should.equal(503);
                done();
            });
        })
        it('should allow a normal ip', function(done) {
            http.get('http://localhost:3000?address=' + ipv4.valid, function (res) {
                res.statusCode.should.equal(200);
                done();
            });
        })
        /*it('should block an ip from a blacklisted range', function(done) {
            http.get('http://localhost:3000?address=' + ipv4.blockedRange, function (res) {
                res.statusCode.should.equal(503);
                done();
            });
        })*/
    })
})