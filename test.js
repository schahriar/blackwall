var chai = require("chai");
var BlackWall = require("./blackwall");
var inspect = require("util").inspect;
var http = require('http');
var net = require('net');
var express = require('express');
var async = require('async');

// NodeJS 0.10.x
http.globalAgent.maxSockets = Infinity;

var _ = require("lodash");
var ipaddr = require('ipaddr.js');

var should = chai.should();
var expect = chai.expect;

var ipv6 = {
    valid: "2001:0db8::0001",
    validAlt: "fdb3:837:c302::48",
    expanded: "2001:db8:0:0:0:0:0:1",
    invalid: "4001:0db8:::0001"
}


var ipv4 = {
    loop: function (i) {
        return "188." + Math.floor(i / (255 * 255)) % 255 + "." + Math.floor(i / 255) % 255 + "." + i % 255;
    },
    blocked: "192.0.2.0",
    blockedRange: "10.53.66.200",
    allowed: "10.0.0.5",
    allowedRange: "14.255.9.255",
    valid: "198.51.100.0",
    invalid: "10.256.0.0"
}

var firewall = new BlackWall();
var policy = firewall.policy('test', [firewall.rules.blacklist, firewall.rules.rateLimiter], {
    rate: {
        s: 10,
        m: 600,
        h: 3000
    },
    blacklist: {
        address: [ipv4.blocked],
        range: ['10.0.0.0/8']
    }
});

var whitelistpolicy = firewall.policy('whitelist', [firewall.rules.whitelist, firewall.rules.rateLimiter], {
    whitelist: {
        address: [ipv4.allowed],
        range: ['14.0.0.0/8']
    }
});

if (policy.constructor === Error) throw policy;

/// Express Server
var app = express();

// Allow ip address spoofing for testing purposes
app.use(function (req, res, next) {
    if (req.query.address) req.overrideip = (req.query.address);
    next();
})

// Unsafe allows for overriding ip address
app.use(firewall.enforce("express", policy, { unsafe: true }));

app.get('/', function (req, res) { res.send('Hello World!') })
app.listen(3000);
///

/// TCP Server
var server = net.createServer(function (socket) {
    firewall.enforce(policy)(
        socket.remoteAddress,
        function () { socket.end("FIREWALL"); },
        function () { socket.write('connected'); }
        )
});
server.listen(3100);
///

describe('BlackWall Test Suite', function () {
    this.timeout(60000)
    describe('Session & Member management checks', function () {
        it('should add member to specified list', function (done) {
            var session = firewall.session(ipv6.expanded, {
                ip: ipv6.expanded
            })
            // Add member
            firewall.assign(session, policy, function (error, member) {
                if (error) throw error;
                expect(member).to.be.an('Object');
                // Check for member
                policy.bloc.members.get(ipv6.expanded, function (error, member) {
                    if (error) throw error;
                    expect(member).to.be.an('Object');
                    done();
                });
            });
        })
        it('should allow mass member additions (3000 ipv4s)', function () {
            // Vulnerable to DoS attacks | Use a database store or some other method to store sessions //
            // Add 3000 members
            var ParallelExecutionArray = [];
            for (i = 0; i < 3000; i++) {
                var ip = ipv4.loop(i);
                (function (ip) {
                    ParallelExecutionArray.push(function (callback) {
                        firewall.assign(firewall.session(ip, { ip: ip }), policy, callback);
                    })
                })(ip)
            }
            async.parallel(ParallelExecutionArray, function (error, results) {
                // Check for members' length
                policy.bloc.members.length(function (error, length) {
                    expect(results.length).to.be.at.least(3000);
                })
            });
        })
        it.skip('should allow mass member removals (2995 ipv4s)', function (done) {
            // Remove 2995 members
            policy.bloc.members.list(function (error, keys) {
                if (error) throw error;
                
                done();
            })
        })
        it('should expand ipv6 members when added to specified list', function () {
            // Add member
            var session = firewall.session(ipv6.valid, { ip: ipv6.valid });
            // Assign To Policy
            firewall.assign(session, policy, function (error, member) {
                expect(member.id).to.equal(ipv6.expanded);
                // Check for member
                policy.bloc.members.get(ipv6.expanded, function (error, member) {
                    expect(member).to.be.an('Object');
                })
            });
        })
        it('should return an error when sessions are assigned to non-existent policy', function () {
            // Add member
            var session = firewall.session(ipv6.validAlt, { ip: ipv6.validAlt });
            // Assign
            var result = firewall.assign(session, null);
            expect(result).to.be.an.instanceof(Error);
        })
    })

    describe('Framework checks', function () {
        this.timeout(5000);
        it('should run Express', function (done) {
            http.get('http://localhost:3000', function (res) {
                res.statusCode.should.equal(200);
                done();
            });
        })
        it('should run Custom Framework', function (done) {
            net.connect({ port: 3100 }).on('data', function (data) {
                data.toString().should.equal('connected');
                done();
            })
        })
    });
});

describe('Predefined Rules Test Suite', function () {
    this.timeout(5000);
    describe('RateLimiter', function () {
        it('should allow initial connection', function (done) {
            http.get('http://localhost:3000', function (res) {
                res.statusCode.should.equal(200);
                done();
            });
        })
        it('should ignore if more than 10 connections are made within a second', function (done) {
            for (i = 0; i < 10; i++) http.get('http://localhost:3000');
            http.get('http://localhost:3000', function (res) {
                res.statusCode.should.equal(503);
                done();
            });
        })
        it('should allow < 10 calls after a second', function (done) {
            setTimeout(function () {
                for (i = 0; i < 4; i++) http.get('http://localhost:3000');
                http.get('http://localhost:3000', function (res) {
                    res.statusCode.should.equal(200);
                    done();
                });
            }, 1200);
        })
    })
    describe('Blacklist', function () {
        it('should block a blacklisted ip', function (done) {
            http.get('http://localhost:3000?address=' + ipv4.blocked, function (res) {
                res.statusCode.should.equal(503);
                done();
            });
        })
        it('should allow a normal ip', function (done) {
            http.get('http://localhost:3000?address=' + ipv4.valid, function (res) {
                res.statusCode.should.equal(200);
                done();
            });
        })
        it('should block an ip from a blacklisted range', function (done) {
            http.get('http://localhost:3000?address=' + ipv4.blockedRange, function (res) {
                res.statusCode.should.equal(503);
                done();
            });
        })
    })
    describe('Whitelist', function () {
        it('*should swap policies', function () {
            expect(policy.swap(whitelistpolicy).name).to.equal(whitelistpolicy.name);
            expect(policy.swap(whitelistpolicy).rules).to.deep.equal(whitelistpolicy.rules);
            expect(policy.swap(whitelistpolicy).options).to.deep.equal(whitelistpolicy.options);
        })
        it('should block a non-whitelisted ip', function (done) {
            http.get('http://localhost:3000?address=' + ipv4.valid, function (res) {
                res.statusCode.should.equal(503);
                done();
            });
        })
        it('should allow a whitelisted ip', function (done) {
            http.get('http://localhost:3000?address=' + ipv4.allowed, function (res) {
                res.statusCode.should.equal(200);
                done();
            });
        })
        it('should allow a whitelisted range', function (done) {
            http.get('http://localhost:3000?address=' + ipv4.allowedRange, function (res) {
                res.statusCode.should.equal(200);
                done();
            });
        })
        it('should block an invalid ipv4', function (done) {
            http.get('http://localhost:3000?address=' + ipv4.invalid, function (res) {
                res.statusCode.should.equal(503);
                done();
            });
        })
        it('should block an invalid ipv6', function (done) {
            http.get('http://localhost:3000?address=' + ipv6.invalid, function (res) {
                res.statusCode.should.equal(503);
                done();
            });
        })
    })
})