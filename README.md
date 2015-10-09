<img src="https://raw.githubusercontent.com/schahriar/blackwall/master/blackwall.png" alt="Blackwall firewall" title="Blackwall" />

**blackwall** is a programmable firewall module designed for NodeJS. You can integrate it into your TCP connections, use it a an ExpressJS middleware, or even as a proxy server cleaning out your traffic before reaching the destination server or port. The setup is simple. Create a Policy with your own rule functions or some of the predefined rules (such as **ratelimiting**, **blacklisting**, **whitelisting**), create a session when a client connects and assign this session to the Policy. You can then add more information to this session for the rules and terminate it after you are done with the client. It is still in Beta so there will be major API changes in the future versions.

# Features
Currently included in the *Beta* version:

1. Session handling
2. ipv4 & ipv6 support
1. Custom Rules (as functions with their own storage)
4. Frameworks (Ready to Use ExpressJS Framework)

# Usage
```
npm install blackwall
```

Enabling **blackwall** on an Express server with defined rules:
```javascript
var express = require("express");
var blackwall = require("blackwall");

// Create a new instance of blackwall
var firewall = new blackwall();
// Create a new Policy with a single rule to limit connections from each Client to 20 per minute
var policy = firewall.addPolicy('policy_name', [
    {
        name: 'rateLimiter',
        description: 'Limits Session Rate based on hits per minute',
        func: function(options, local, callback){
            if(local.total >= options.get('rate.minute')) {
                callback("Max Number Of Hits Reached");
            }else{
                local.total = (local.total)?local.total+1:1;
                callback(null, true);
            }
            // Possibly a better way than storing multiple Date Objects
            setTimeout(function(){
                local.total = (local.total)?local.total-1:1;
            }, 60000);
        }
    }
], {
    rate: {
        minute: 20
    }
})

app.use(firewall.enforce("express", policy));

app.get('/', function (req, res) { res.send('Hello World!') })
app.listen(3000);
```

# Methods

**addPolicy:** (name:String || policy:Object, rules:Array, options:Object, priority:Float) RETURNS: Policy:Object - *Creates a new Policy with the given rules and priority. Note that policy names require to be completely unique, otherwise conflicts may occur.*

**removePolicy:** (name:String || policy:Object) - *Removes a Policy.*

**session:** (identifier:String, information:Object) RETURNS: Session:Object -
*Creates a new session with the given unique identifier (e.g. ip address) and information object attached to it.*

**session->terminate** () - *Terminates a session*

**assign:** (session:Object, policy:Object) -
*Assigns a policy to a session.*

**addFramework:** (name:String, framework:Object) - *Adds a given framework to frameworks list. This can be later called through .enforce(framework-name)*

**enforce:** (framework:String, options:Object) - *returns a function to be applied when a new connection is made.*

# Rules
Rules are objects defined in policies that contain a function, its name and description. Rules are called parallel of each other with a options object which contains a get function, a unique rule local store and a callback. A rule can perform I/O operations if necessary and call the callback once done. If a callback has an error the session would be terminated and similarly if a session needs to be terminated use a callback(new Error('your error string')). A rule **func** Function is also provided with a session context. You can access data such as session information through this.information and session identifier through this.id and so on.

Alternatively you can pass a group String or groups Array to share a common object with other rule functions operating under the same storage values. This can reduce the storage load as multiple rules are applied.

In order to receive specific options use options.get('key1.childkey2') format. For example when options = { rate: { max: 2 }} you can receive the max rate using options.get('rate.max') and so on. If a nested value does not exist the function will return *undefined*. This custom implementation is to prevent errors when options are not available.

Any value stored in the local store is unique to the session identifier which identifies the Client and stores all session from that specific Client in a scope. Therefore you can modify the local value based on the Client's interaction without the need to create specific objects or storage methods of your own.
e.g.
```javascript
var policy = firewall.addPolicy('name', [
    {
        name: 'store test',
        description: 'logs the total number of sessions from the client every time a new session is created',
        group: 'counters',
        func: function(options, local, counters, callback) {
            counters.totalSessions = (counters.totalSessions)?counters.totalSessions+1:1;
            if(!local.totalNumberOfSessions) local.totalNumberOfSessions = 0;
            local.totalNumberOfSessions++;
            console.log("TOTAL SESSIONS FROM", this.id, local.totalNumberOfSessions);
        }
    }
])
...
// Output on every session
// TOTAL SESSIONS FROM 127.0.0.1 1
// TOTAL SESSIONS FROM 127.0.0.1 2
// TOTAL SESSIONS FROM 127.0.0.1 3
// TOTAL SESSIONS FROM 127.0.0.1 4
// ...
```

# Frameworks
Frameworks are modules that return a function that enables **blackwall** integration to 3rd-party systems. Currently **blackwall** is packaged with:
- *Express* framework
- Custom framework

You can enforce **blackwall** using a custom code:
```javascript
var firewall = new blackwall();
var onAccess = firewall.enforce();

// Call onAccess to run firewall
/*  onAccess(
        <ip-address>,
        <function-to-terminate-access>,
        <function-to-call-when-access-granted>
    )
*/

```

# What's next?

Upcoming Features:

1. Clustering
2. Events
3. Proxy support

<br>
Features planned for *Stable Release* version:

1. Geo-location based policies
2. Deep packet inspection
3. Analytics
4. Outgoing support

# Test Suite
You can test **blackwall** using the Mocha module. This includes express and TCP tests.
```javascript
npm test
```

# License
Who doesn't love [MIT license](https://raw.githubusercontent.com/schahriar/blackwall/master/LICENSE)?
