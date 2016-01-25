/**
 * Created by zh99998 on 16/1/23.
 */
var querystring = require('querystring');
var crypto = require('crypto');
var path = require('path');

//$.get('http://127.0.0.1:3000/run')

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
    {"id": 11, "title": "这是一个测试公告", content: '似乎是好的', image: "http://www.ygobbs.com/Public/pic/show1.jpg"},
    {
        "id": 12,
        "title": "这是另一个测试公告",
        content: '星光咕噜毛也是好的',
        image: "http://bbs.ygobbs.com/data/attachment/forum/201507/19/193730rgervzg4vr74zgvv.gif"
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
    var options = {};
    $(this).serializeArray().forEach(function (item) {
        options[item.name] = item.value
    });
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

    local.send('start', {
        lastip: address,
        lastport: port,
        roompass: password,
        nickname: user.name
    }, ['-j']);
    $('#game-create-modal').modal('hide');
});


var match_request = null;
$('#game-match').on('click', function () {
    $(this).prop('disabled', true).text('等待对手');
    $.post({
            url: 'https://api.mycard.moe/ygopro/match',
            timeout: 60000,
            dataType: "json",
            cache: false,
            headers: {
                Authorization: 'Basic ' + btoa(user.username + ':' + user.password)
            }
        })
        .done(function (data, textStatus, jqXHR) {
            local.send('start', {
                lastip: data.address,
                lastport: data.port,
                roompass: data.password,
                nickname: user.name
            }, ['-j']);
        })
        .fail(function (data, textStatus, jqXHR) {
            alert('匹配失败', textStatus);
        })
        .always(function () {
            $('#game-match').prop('disabled', false).text('自动匹配');
        })
});

//deck

$('#deck').change(function (event) {
    local.send('start', {
        lastdeck: $(this).val()
    })
});
$('#deck-edit').click(function (event) {
    event.preventDefault();
    var deck = $('#deck').val();
    if (deck == null) return;
    local.send('start', {
        lastdeck: deck
    }, ['-d']);
});
$('#deck-delete').click(function (event) {
    event.preventDefault();
    var deck = $('#deck').val();
    if (deck == null) return;
    local.send('delete', path.join('deck', deck + '.ydk'));
    $('#deck > option:selected').remove();
    alert('删除卡组', '卡组 ' + deck + ' 已删除');
});
/*$('#deck-rename').click(function(){
 event.preventDefault();
 local.send('deck-copy', $('#deck').val());
 });
 $('#deck-copy').click(function(){
 event.preventDefault();
 local.send('deck-copy', $('#deck').val());
 });*/

// local
var websocket = new WebSocket('ws://127.0.0.1:9999');
websocket.onmessage = function (event) {
    var message = JSON.parse(event.data);
    switch (message.event) {
        case 'init':
            var decks_element = $('#deck');
            decks_element.empty();
            for (var i in message.data.decks) {
                var deck = message.data.decks[i];
                $('<option/>', {
                    value: deck.name,
                    text: deck.name,
                    selected: deck.name == message.data.system.lastdeck
                }).appendTo(decks_element);
            }
            $('.require-local').prop('disabled', false);
            $('#game-match').prop('disabled', !!match_request);
            break
    }
};
websocket.onclose = function () {
    $('#deck').html('<option>Loading...</option>');
    $('.require-local').prop('disabled', true);
};
var local = {
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