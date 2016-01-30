/**
 * Created by zh99998 on 16/1/23.
 */
var querystring = require('querystring');
var crypto = require('crypto');
var path = require('path');

// patch browserify
path.win32 = $.extend({}, path);
path.win32.join = function () {
    return path.join.apply(this, arguments).replace('/', '\\');
};

var user;

// login
var token = querystring.parse(location.search.slice(1)).sso;
/*if (token) {
 localStorage.setItem('token', token);
 }
 if (!token) {
 token = localStorage.getItem('token');
 }*/
if (token) {
    login(querystring.parse(new Buffer(token, 'base64').toString()));
} else {
    return redirect_to_login()
}

function redirect_to_login(logout) {
    $(document.body).html('Loading...');
    crypto.randomBytes(64, function (error, buffer) {
        var nonce = buffer.toString('hex');

        var payload = new Buffer(querystring.stringify({
            //nonce: nonce,
            return_sso_url: location.href
        })).toString('base64');

        var request = querystring.stringify({
            'sso': payload,
            'sig': crypto.createHmac('sha256', 'zsZv6LXHDwwtUAGa').update(payload).digest('hex')
        });
        var login_url = "https://forum.touhou.cc/session/sso_provider?" + request;
        if (logout) {
            localStorage.removeItem('token', token);
            request = querystring.stringify({
                'redirect': login_url
            });
            location.href = "https://forum.touhou.cc?" + request;
        } else {
            location.href = login_url;
        }

    });
}
function login(u) {
    user = u;
    $('#game-create-title').val(user.username + ' 的房间');

    var candy = $('#candy');
    var candy_url = 'candy/index.html?' + querystring.stringify({
            jid: user.username + '@mycard.moe',
            password: user.external_id,
            nickname: user.username,
            autojoin: 'ygopro_china_north@conference.mycard.moe'
        });

    if (candy.attr('src') != candy_url) {
        candy.attr('src', candy_url);
    }
}

// announcements
var announcements = [
    {
        "id": 11,
        "title": "这是一个测试公告",
        content: '聚集的祈愿将成为新生的闪耀之星。化作光芒闪耀的道路吧！',
        image: "https://forum-cdn.touhou.cc/uploads/default/optimized/2X/a/a80ead0ab65c557ba68abec75a20761076ee9d37_1_555x500.jpg"
    },
    {
        "id": 12,
        "title": "这是另一个测试公告",
        content: '看看那被伟大之风引导的翅膀吧！',
        image: "https://forum-cdn.touhou.cc/uploads/default/optimized/2X/8/8f12ebbf0606907c710ce16e753d9c1347e41873_1_690x466.jpg"
    }];

$('.carousel-indicators').empty();
$('.carousel-inner').empty();
for (var i in announcements) {
    $('<li data-target="#announcements" data-slide-to="' + i + '"></li>').appendTo('.carousel-indicators');
    $('<div class="carousel-item" style="background-image: url(' + announcements[i].image + ')"><div class="carousel-caption"><h3>' + announcements[i].title + '</h3><p>' + announcements[i].content + '</p></div></div>').appendTo('.carousel-inner')
}
$('.carousel-indicators > li:first-child').addClass('active');
$('.carousel-item:first-child').addClass('active');

// create game
$('#game-create').submit(function (event) {
    event.preventDefault();
    var options = $(this).serializeObject();
    var options_buffer = new Buffer(6);
    /* rule: 3bits, mode: 2bits, extra: 3bits*/
    /* lp: 16bits, hand: 4bits, count: 4bits*/
    /* public: 1bits */

    options_buffer.writeUInt8((options.private == 'on' ? 2 : 1) << 4, 1);
    options_buffer.writeUInt8(parseInt(options.rule) << 5 | parseInt(options.mode) << 3 | (options.enable_priority == 'on' ? 1 << 2 : 0) | (options.no_check_deck == 'on' ? 1 << 1 : 0) | (options.no_shuffle_deck == 'on' ? 1 : 0), 2);
    options_buffer.writeUInt16LE(parseInt(options.start_lp), 3);
    options_buffer.writeUInt8(parseInt(options.start_hand) << 4 | parseInt(options.draw_count), 5);
    var checksum = 0;
    for (var i = 1; i < options_buffer.length; i++) {
        checksum -= options_buffer.readUInt8(i)
    }
    options_buffer.writeUInt8(checksum & 0xFF, 0);

    console.log('plain', options_buffer);

    var secret = user.external_id % 65535 + 1;
    for (i = 0; i < options_buffer.length; i += 2) {
        options_buffer.writeUInt16LE(options_buffer.readUInt16LE(i) ^ secret, i)
    }

    console.log('crypted', options_buffer);

    var password = options_buffer.toString('base64') + options.title;
    var room_id = crypto.createHash('md5').update(password + user.username).digest('base64').slice(0, 10).replace('+', '-').replace('/', '_')
    console.log(room_id)


    var address = '122.0.65.73';
    var port = '7911';

    eventemitter.send('action', 'ygopro', 'join', {
        lastip: address,
        lastport: port,
        roompass: password,
        nickname: user.username
    });
    $('#game-create-modal').modal('hide');
});


var match_request = null;
$('#game-match').on('click', function () {
    $(this).prop('disabled', true).text('等待对手');
    match_request = $.post({
            url: 'https://mycard.moe/ygopro/match',
            timeout: 60000,
            dataType: "json",
            cache: false,
            headers: {
                Authorization: 'Basic ' + new Buffer(user.username + ':' + user.external_id).toString('base64')
            }
        })
        .done(function (data, textStatus, jqXHR) {
            eventemitter.send('action', 'ygopro', 'join', {
                lastip: data.address,
                lastport: data.port,
                roompass: data.password,
                nickname: user.username
            });
        })
        .fail(function (data, textStatus, jqXHR) {
            alert('匹配失败', textStatus);
        })
        .always(function () {
            match_request = null;
            $('#game-match').prop('disabled', false).text('自动匹配');
        })
});

//deck

$('#deck').change(function (event) {
    eventemitter.send('write', 'ygopro', 'system.conf', {
        lastdeck: $(this).val()
    }, true)
});
$('#deck-edit').click(function (event) {
    event.preventDefault();
    var deck = $('#deck').val();
    if (deck == null) return;
    eventemitter.send('action', 'ygopro', 'deck', {
        lastdeck: deck
    });
});
$('#deck-delete').click(function (event) {
    event.preventDefault();
    var deck = $('#deck').val();
    if (deck == null) return;
    eventemitter.send('delete', path.join('deck', deck + '.ydk'));
    $('#deck > option:selected').remove();
    alert('删除卡组', '卡组 ' + deck + ' 已删除');
});
/*$('#deck-rename').click(function(){
 event.preventDefault();
 eventemitter.send('deck-copy', $('#deck').val());
 });
 $('#deck-copy').click(function(){
 event.preventDefault();
 eventemitter.send('deck-copy', $('#deck').val());
 });*/
var install_app = null;
// eventemitter
var websocket = new ReconnectingWebSocket('ws://127.0.0.1:9999');
var db;

function update(app, local, reason) {
    if (reason == 'install-failed') {
        new Notification(app.locales['zh-CN'].name, {body: '安装失败'});
        $('#status').empty();
    }
    if (reason == 'install-successful') {
        new Notification(app.locales['zh-CN'].name, {body: '安装完成'});
    }
    if (app.id == 'ygopro') {
        if (local.status == 'installing') {
            $('#status').html('正在安装 <i class="icon-spin animate-spin"></i>');
        } else if (local.status == 'ready') {
            var decks_element = $('#deck');
            decks_element.empty();
            for (var file in local.files) {
                var matched = file.match(/deck(?:\/|\\)(.*).ydk/);
                if (matched) {
                    var deck = matched[1];
                    $('<option/>', {
                        value: deck,
                        text: deck,
                        selected: deck == local.files['system.conf'].content.lastdeck
                    }).appendTo(decks_element);
                }
            }
            $('#status').empty();
            $('.require-local').prop('disabled', false);
        }
    }
}
websocket.onmessage = function (event) {
    var message = JSON.parse(event.data);
    switch (message.event) {
        case 'login':
            login(message.data[0]);
            break;
        case 'bundle':
            var app = message.data[0][0];
            if (db.platform == 'darwin') {
                eventemitter.send('install', app, {})
            } else {
                $('#install-title').text(app.locales['zh-CN'].name);
                $('#install-modal').modal('show');
                $('#install').submit(function (event) {
                    event.preventDefault();
                    var options = $(this).serializeObject();
                    eventemitter.send('install', app, options);
                    $('#install-modal').modal('hide');
                });
                $('#install-path').val(path.win32.join(db.default_apps_path, app.id));
                $('#install-browse').change(function (event) {
                    var file = event.target.files[0];
                    if (file) {
                        $('#install-path').val(file.path);
                    }
                });
            }
            break;
        case 'init':
            db = message.data[0];
            for (var app_id in db.local) {
                update(db.apps[app_id], db.local[app_id]);
            }
            break;
        case 'update':
            var app = message.data[0];
            var local = message.data[1];
            var reason = message.data[2];
            update(app, local, reason);

    }
};
websocket.onopen = function () {
    eventemitter.send('login', user);
};
websocket.onclose = function () {
    $('#status').html('载入中 <i class="icon-spin animate-spin"></i>');
    $('.require-local').prop('disabled', true);
    if (match_request) {
        match_request.abort();
        match_request = null;
    }
    websocket = new WebSocket('ws://127.0.0.1:9999');
};
var eventemitter = {
    on: function (event, callback) {
    },
    send: function (event) {
        websocket.send(JSON.stringify({event: event, data: Array.prototype.slice.call(arguments, 1)}))
    }
};

var alert = function (title, message) {
    $('#alert-title').text(title);
    $('#alert-message').text(message);
    $('#alert-modal').modal('show');
};

if (!navigator.userAgent.match(/mycard/)) {
    $('#install-browse-wrapper').remove()
}

var default_options = {
    mode: 1,
    rule: 2,
    start_lp: 8000,
    start_hand: 5,
    draw_count: 1,
    enable_priority: false,
    no_check_deck: false,
    no_shuffle_deck: false
};
var modes = {0: '单局模式', 1: '比赛模式', 2: 'TAG'};
var rules_short = {0: '专有卡禁止', 1: 'TCG', 2: 'OCG', 3: 'O/T'};

function room_template(room, server) {
    room.options = $.extend({}, default_options, room.options);
    var result = '<tr id="room-' + server.id + '-' + room.id + '" class="room" data-server-id="' + server.id + '"><td class="title">' + room.title + '</td><td class="users">';
    for (var j = 0; j < room.users.length; j++) {
        result += '<img class="avatar" src="https://forum-cdn.touhou.cc/user_avatar/forum.touhou.cc/zh99998/36/167_1.png">'
    }
    result += '</td><td class="mode">' + modes[room.options.mode] + '</td><td class="extra">';
    var extra = [];
    if (room.options.rule != default_options.rule) {
        extra.push(rules_short[room.options.rule]);
    }
    if (room.options.start_lp != default_options.start_lp) {
        extra.push(room.options.start_lp + 'LP');
    }
    if (room.options.start_hand != default_options.start_hand) {
        extra.push(room.options.start_hand + '初始');
    }
    if (room.options.draw_count != default_options.draw_count) {
        extra.push(room.options.draw_count + '抽卡');
    }
    if (room.options.enable_priority != default_options.enable_priority) {
        extra.push('优先权');
    }
    if (room.options.no_check_deck != default_options.no_check_deck) {
        extra.push('不检查');
    }
    if (room.options.no_shuffle_deck != default_options.no_shuffle_deck) {
        extra.push('不洗卡');
    }
    result += extra.join(' ');
    return result
}
$('#game-list-modal tbody').on('click', '.room', function (event) {
    var server = servers[$(this).attr('data-server-id')];

    var room_id = $(this).attr('id').slice(server.id.length + 6);
    var options_buffer = new Buffer(6);
    options_buffer.writeUInt8(3 << 4, 1);
    var checksum = 0;
    for (var i = 1; i < options_buffer.length; i++) {
        checksum -= options_buffer.readUInt8(i)
    }
    options_buffer.writeUInt8(checksum & 0xFF, 0);

    var secret = user.external_id % 65535 + 1;
    for (i = 0; i < options_buffer.length; i += 2) {
        options_buffer.writeUInt16LE(options_buffer.readUInt16LE(i) ^ secret, i)
    }


    var password = options_buffer.toString('base64') + room_id;

    eventemitter.send('action', 'ygopro', 'join', {
        lastip: server.address,
        lastport: server.port,
        roompass: password,
        nickname: user.username
    });

});


var servers = {
    "master": {
        id: 'master', url: 'wss://master.mycard.moe:7923', address: '122.0.65.73', port: '7911', private: null
    }
};
var roomlist_connections = [];
$('#game-list-modal').on('show.bs.modal', function (event) {
    var tbody = $('#game-list-modal tbody');
    for (var server_id in servers) {
        (function (server) {
            if (server.private) return;
            var connection = new ReconnectingWebSocket(server.url);
            connection.onclose = function (event) {
                tbody.children('[data-server-id="' + server.id + '"]').remove()
            };
            connection.onmessage = function (event) {
                console.log(event)
                var message = JSON.parse(event.data);
                switch (message.event) {
                    case 'init':
                        tbody.children('[data-server-id="' + server.id + '"]').remove();
                        for (var i = 0; i < message.data.length; i++) {
                            tbody.append(room_template(message.data[i], server));
                        }
                        break;
                    case 'create':
                        tbody.append(room_template(message.data, server));
                        break;
                    case 'update':
                        $('#room-' + server.id + '-' + message.data.id).replaceWith(room_template(message.data, server));
                        break;
                    case 'delete':
                        $('#room-' + server.id + '-' + message.data).remove();
                    //auto width not works.
                    /*var thead = $('#game-list-modal .modal-header th');
                     tbody.find('tr:first-child td').each(function (index, element) {
                     $(thead[index]).width($(element).width())
                     });
                     */
                }
            };
            roomlist_connections[server_id] = connection;
        })(servers[server_id]);
    }
});

$('#game-list-modal').on('hide.bs.modal', function (event) {
    for (var i in roomlist_connections) {
        roomlist_connections[i].close();
    }
});