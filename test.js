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

var firewall = new BlackWall();
var policy = firewall.addPolicy('test', [{
    name: 'rateLimiter',
    description: 'Limits Session Rate based on hits per hour|minute|second',
    func: function(options, local, callback){
        if(local.totalHits >= options.rate.max) {
            callback("Max Number Of Hits Reached");
        }else{
            local.totalHits = (local.totalHits)?local.totalHits+1:1;
            callback(null, true);
        }
        // Possibly a better way than storing multiple Date Objects
        setTimeout(function(){
            local.totalHits = (local.totalHits)?local.totalHits-1:1;
        }, 1000);
    }
}], {
    rate: {
        max: 10
    }
});

if(policy.constructor === Error) throw policy;

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

/// TCP Server
/*var server = net.createServer(function(socket) {
    firewall.enforce()(
        socket.remoteAddress,
        function() { socket.end("FIREWALL"); },
        function() { socket.write('connected'); }
    )
});
server.listen(3100);*/
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

/* describe('TCP firewall checks', function(){
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
    });*/

    /*describe('Whitelist ip firewall checks', function(){
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
    });*/
});