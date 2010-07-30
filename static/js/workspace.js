function Workspace (rootElem, account) {
    if (!(this instanceof Workspace))
        return new Workspace(rootElem, account);
    var self = this;
    
    $('form#login').fadeOut(400);
    
    var selectPane = $('<div>')
        .addClass('left-pane')
        .attr('id','select-pane')
        .hide()
        .fadeIn(400);
    ;
    rootElem.append(selectPane);
    
    var windowPane = $('<div>')
        .attr('id','window-pane')
        .hide()
        .fadeIn(400)
    ;
    rootElem.append(windowPane);
    
    var quickBar = new QuickBar;
    rootElem.append(quickBar.element);
    quickBar.on('restore', function (vm, port) {
        self.attach(vm, port);
    });
    
    var sheet = $('<div>')
        .attr('id','sheet')
        .hide()
        .click(function () {
            sheet.fadeOut(400);
            var win = $('.vm-window-fullscreen');
            win.removeClass('vm-window-fullscreen');
            var pos = win.offset();
            pos.left -= 200;
            win.offset(pos);
            windowPane.offset({ left : 200, top : 0 })
        })
    ;
    rootElem.append(sheet);
    
    var infoPanes = {};
    self.addInfoPane = function (vm) {
        var elem = $('<div>')
            .hide()
            .addClass('left-pane')
            .attr('id','info-pane')
            .append(
                $('<div>')
                    .addClass('back')
                    .text('back')
                    .click(function () {
                        selectPane.fadeIn(400);
                        elem.fadeOut(400);
                    })
                ,
                $('<p>').text(vm.name),
                $('<p>').text('Instances:'),
                $('<p>').append.apply(
                    $('<p>').attr('id','instance-list'),
                    vm.processes.map(function (proc) {
                        return $('<p>').append($('<a>')
                            .text(proc.engine + '[' + proc.port + ']')
                            .click(function () {
                                self.attach(vm, proc.port);
                            })
                        );
                    })
                ),
                $('<a>')
                    .text('spawn in qemu')
                    .click(function () {
                        self.spawn(vm, 'qemu');
                    })
            )
        ;
        infoPanes[vm.id] = elem;
        rootElem.append(elem);
    };
    
    self.useVM = function (vm) {
        selectPane.append($('<div>')
            .addClass('vm-desc')
            .click(function () {
                selectPane.fadeOut(400);
                infoPanes[vm.id].fadeIn(400);
            })
            .append($('<div>').text(vm.name))
        );
        self.addInfoPane(vm);
    };
    
    self.spawn = function (vm, engine) {
        account.spawn({ vm : vm.id, engine : engine }, function (proc) {
            vm.processes.push({
                port : proc.port,
                engine : 'qemu',
                vm : vm.id
            });
            
            $('#instance-list').append(
                $('<p>').append($('<a>')
                    .text(engine + '[' + proc.port + ']')
                    .click(function () {
                        self.attach(vm, proc.port);
                    })
                )
            );
        });
    };
    
    var windows = {};
    self.attach = function (vm, port) {
        account.attach(port, function (desktop) {
            if (!desktop) {
                console.log('desktop == null');
            }
            else {
                var win = new Window({
                    fb : new FB({ desktop : desktop }),
                    name : vm.name
                });
                var i = Object.keys(windows).length;
                windows[i] = win;
                
                win.on('minimize', function () {
                    if (i in windows) {
                        delete windows[i];
                        account.detach(port);
                        quickBar.push(vm, port);
                    }
                });
                
                win.on('fullscreen', function () {
                    sheet.fadeIn(400);
                    windowPane.offset({ left : 0, top : 0 })
                });
                
                win.on('close', function () {
                    if (i in windows) {
                        delete windows[i];
                        account.detach(port);
                    }
                });
                
                win.on('kill', function () {
                    $('#instance-list p a').filter(function () {
                        return $(this).text().match(/\[(\d+)\]$/)[1] == port;
                    }).remove();
                    account.kill(port, function () {});
                });
                
                windowPane.append(win.element);
                Object.keys(windows).forEach(function (k) {
                    windows[k].unfocus();
                });
                
                win.focus();
            }
        });
    };
    
    account.virtualMachines(function (vms) {
        // vms maps vm ids to { vm id, name, filename }
        account.processes(function (procs) {
            // procs maps ports to { pid, vm id, port, engine }
            Object.keys(vms).forEach(function (vmId) {
                var vm = vms[vmId];
                self.useVM({
                    id : vm.id,
                    name : vm.name,
                    filename : vm.filename,
                    processes : Object.keys(procs)
                        .map(function (port) { return procs[port] })
                        .filter(function (p) { return vm.id == p.vm })
                    ,
                });
            });
        });
    });
}

