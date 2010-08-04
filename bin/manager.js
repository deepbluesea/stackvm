#!/usr/bin/env node
// Manage VM instances

var sys = require('sys');
var fs = require('fs');
var crypto = require('crypto');

var DNode = require('dnode');

var managers = require('../lib/managers');

var users = JSON.parse(
    fs.readFileSync(__dirname + '/../data/users.json', 'ascii')
);

DNode(function (client,conn) {
    return new Manager({
        client : client,
        connection : conn,
    });
}).listen(9077);

function Manager(params) {
    var self = this;
    var client = params.client;
    var conn = params.connection;
    
    self.spawn = function (params, f) {
        var engine = params.engine; // qemu, vmware, vbox
        managers[engine].spawn(params.user, params.disk, f);
    };
    
    self.kill = function (addr, f) {
        Object.keys(managers).forEach(function (engine) {
            if (addr in managers[proc.engine].processes) {
                managers[proc.engine].kill(proc, f);
            }
        });
    };
    
    self.restart = function (addr, f) {
        Object.keys(managers).forEach(function (engine) {
            if (addr in managers[proc.engine].processes) {
                var proc = managers[proc.engine].processes[addr];
                self.kill(addr, function () {
                    self.spawn(proc, f);
                });
            }
        });
    };
    
    // Authentication will get its own DNode server eventually.
    // For now:
    self.authenticate = function (name, pass, f) {
        var hash = new crypto.Hash('sha512').update(pass).digest('hex');
        var user = users[name.toLowerCase()];
        if (user && user.hash == hash) {
            f({
                contacts : user.contacts,
                disks : user.disks,
                processes : Object.keys(managers).reduce(
                    function (acc,m) {
                        (m.processes || []).forEach(function (p) {
                            acc[p.addr] = p
                        });
                        return acc;
                    }, {}
                ),
            });
            f(user);
        }
        else {
            f(null);
        }
    };
}

