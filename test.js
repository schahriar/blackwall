var blackwall = require("./blackwall");
var inspect = require("util").inspect;
var firewall = new blackwall();

firewall.addMember("global","2001:0db8::0001");

var count = 0;

for(i=0; i<31; i++) {
  count++;
  console.log(count, firewall.admit("2001:0db8::0001"));
}

setTimeout(function(){
  for(i=0; i<31; i++) {
    count++;
    console.log(count, firewall.admit("2001:0db8::0001"));
  }
  console.log(inspect(firewall.policy.lists.global.members, {color:true}));
  console.log("LENGTH", firewall.policy.lists.global.members.length);
}, 6000);
