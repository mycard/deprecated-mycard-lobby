/**
 * Created by zh99998 on 16/1/23.
 */
var querystring = require('querystring');
var crypto = require('crypto');
var path = require('path');

// patch browserify
path.win32 = $.clone(path);
path.win32._join = path.win32.join;
path.win32.join = function () {
    return path.win32._join.replace('/', '\\');
};

var user;

// login
var token = querystring.parse(location.search.slice(1)).sso;
if (token) {
    localStorage.setItem('token', token);
}
if (!token) {
    token = localStorage.getItem('token');
}
if (token) {
    user = querystring.parse(new Buffer(token, 'base64').toString());
    $('#game-create-title').val(user.name + ' 的房间');

    $('#candy').attr('src', 'candy/index.html?' + querystring.stringify({
            jid: user.username + '@mycard.moe',
            password: user.external_id,
            autojoin: 'ygopro_china_north@conference.mycard.moe'
        }));
} else {
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
        location.href = "https://forum.touhou.cc/session/sso_provider?" + request;
    });
}

// announcements
var announcements = [
    {
        "id": 11,
        "title": "这是一个测试公告",
        content: '聚集的祈愿将成为新生的闪耀之星。化作光芒闪耀的道路吧！',
        image: "https://secure.static.tumblr.com/5084e6d3b95d24415ed5dd416842ffee/jucea4l/qE8nlmp8n/tumblr_static_tumblr_static_filename_640.jpg"
    },
    {
        "id": 12,
        "title": "这是另一个测试公告",
        content: '看看那被伟大之风引导的翅膀吧！',
        image: "https://yugiohblog.konami.com/articles/wp-content/uploads/2014/06/DanResult3.jpg"
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

    options_buffer.writeUInt8(parseInt(options.rule) << 5 | parseInt(options.mode) << 2 | (options.enable_priority == 'on' ? 1 << 2 : 0) | (options.enable_priority == 'on' ? 1 << 1 : 0) | (options.no_check_deck == 'on' ? 1 : 0), 0);
    options_buffer.writeUInt16LE(parseInt(options.start_lp), 1);
    options_buffer.writeUInt8(parseInt(options.start_hand) << 4 | parseInt(options.draw_count) << 4, 3);
    options_buffer.writeUInt8(parseInt(options.public == 'on' ? 1 << 7 : 0), 4);

    var room_id = options_buffer.toString('base64') + new Buffer(user.name + "\0" + options.title).toString('base64');

    //var cipher = crypto.createCipher('bf-cfb','123');
    //console.log(cipher.update(options_buffer).final('base64'));
    // fuck browserify
    var secret = user.external_id & (1 << 16 - 1);
    for (var i = 0; i < options_buffer.length; i += 2) {
        options_buffer.writeUInt16LE(options_buffer.readUInt16LE(i) ^ secret, i)
    }
    var password = options_buffer.toString('base64') + options.title;

    var address = '122.0.65.73';
    var port = '233';

    eventemitter.send('action', 'ygopro', 'join', {
        lastip: address,
        lastport: port,
        roompass: password,
        nickname: user.name
    });
    $('#game-create-modal').modal('hide');
});


var match_request = null;
$('#game-match').on('click', function () {
    $(this).prop('disabled', true).text('等待对手');
    match_request = $.post({
            url: 'https://api.mycard.moe/ygopro/match',
            timeout: 60000,
            dataType: "json",
            cache: false,
            headers: {
                Authorization: 'Basic ' + btoa(user.username + ':' + user.password)
            }
        })
        .done(function (data, textStatus, jqXHR) {
            eventemitter.send('action', 'ygopro', 'join', {
                lastip: data.address,
                lastport: data.port,
                roompass: data.password,
                nickname: user.name
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
    }
    if (app.id == 'ygopro') {
        if (local.status == 'installing') {
            $('#deck').html('<option>安装中...</option>');
        } else if (local.status == 'ready') {
            var decks_element = $('#deck');
            decks_element.empty();
            for (var file in local.files) {
                var matched = file.match(/deck(?:\/|\\)(.*).ydk/)
                if (matched) {
                    var deck = matched[1];
                    $('<option/>', {
                        value: deck,
                        text: deck,
                        selected: deck == local.files['system.conf'].lastdeck
                    }).appendTo(decks_element);
                }
            }
            $('.require-local').prop('disabled', false);
        }
    }
}
websocket.onmessage = function (event) {
    var message = JSON.parse(event.data);
    switch (message.event) {
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
websocket.onclose = function () {
    $('#deck').html('<option>载入中...</option>');
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