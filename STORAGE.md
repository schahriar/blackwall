## Handling Storage
Handling storage for tens of thousands of sessions using javascript objects can not only be slow but also fatal. This is why Blackwall is equipped with an async storage method which can be replaced with a custom database implementation that stores javascript objects in form of a string or any other supported form that will be queried based on a key, value format. Therefore a simple hash table could be sufficient to provide a proper implementation.

### How to pass your method to Blackwall
Storage handlers should be passed to an instance of Blackwall on creation.
e.g.
```javascript
var blackwall = require('blackwall');
var storage = {};
var firewall = new blackwall(storage);
```
This will ensure proper storage and handling of connections.

### Methods
A storage handler requires at least a **get** and a **set** method. Methods **list** and **length** are semi-optional but important to testing and methods **multiget** and **multiset** are fully optional but can improve overall performance if properly implemented. An object **query** is passed to every function except list/length followed by a function **callback** which will take an error and result argument.

**Get:** (query:Object, callback:Function) - *Requests a single value based on *query.key*. An optional implementation of *query.limit* can improve performance when used with large Arrays.*

**Set:** (query:Object, callback:Function) - *Sets a single value based on *query.key* and *query.value*. An optional implementation of *query.limit* can improve performance when used with large Arrays.*

**list:** (callback:Function) - *Requests a list of all keys stored.*

**length:** (callback:Function) - *Requests the total number of keys stored.*

**Multiget:** (query:Object, callback:Function) *Same as Get with query.key as an array of keys.*

**Multiset:** (query:Object, callback:Function) *Same as Set with query.key and query.value as an array of corresponding keys.*

[An example of this implementation is available at bloc.storage.handler.js](./lib/bloc.storage.handler.js)

## Performance
Values of type Object/Array could be stored as a string using JSON.stringify method but this could provide significant performance drops (and stop the execution of the entire program) as objects get bigger and requests get larger. Therefore a good storage handler should use Database's implementation of Lists, Object, etc. when available or use an async method of JSON.stringify which is for now available in form of modules from NPM. Implementation of multiget method could also improve performance.