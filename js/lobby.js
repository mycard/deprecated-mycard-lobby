// Generated by CoffeeScript 1.6.3
(function() {
  var cards_search, default_room_names, gui, login, mycard_client, mycard_client_connect, mycard_version, nxb, pre_load_photo, render_room, room_template, rooms_connect, servers, set_status, win, xmpp_server, ygopro_version, _i, _results;

  mycard_version = null;

  ygopro_version = null;

  mycard_client = null;

  if ($('html').hasClass('gui')) {
    gui = require('nw.gui');
    win = gui.Window.get();
    $('#window_control_minimize').click(function() {
      return win.minimize();
    });
    $('#window_control_maximize').click(function() {
      return win.maximize();
    });
    $('#window_control_unmaximize').click(function() {
      return win.unmaximize();
    });
    $('#window_control_close').click(function() {
      return win.close();
    });
    win.on('maximize', function() {
      $('#window_control_maximize').hide();
      return $('#window_control_unmaximize').show();
    });
    win.on('unmaximize', function() {
      $('#window_control_maximize').show();
      return $('#window_control_unmaximize').hide();
    });
    win.showDevTools();
    /*
    win.on 'focus', ->
      bootbox.alert('focus')
      $('html').removeClass 'blur'
    win.on 'blur', ->
      bootbox.alert('blur')
      $('html').addClass 'blur'
    */

    $('body').on('click', 'a[target=_blank]', function() {
      gui.Shell.openExternal(this.href);
      return false;
    });
  }

  pre_load_photo = function(jid, name, domain) {
    var hash;
    switch (domain) {
      case 'my-card.in':
        return "http://my-card.in/users/" + name + ".png";
      case 'public.talk.google.com':
        return 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
      default:
        hash = CryptoJS.MD5(jid);
        return "http://en.gravatar.com/avatar/" + hash + "?s=48&d=404";
    }
  };

  nxb = require("node-xmpp-bosh");

  xmpp_server = nxb.start_bosh({
    host: "localhost"
  });

  login = function(name, password, remember_me) {
    $.cookie('username', name, {
      expires: Number.MAX_VALUE,
      path: '/'
    });
    bootbox.dialog({
      message: '正在登录...'
    });
    $('#login_form button[type=submit]').attr('disabled', 'disabled');
    $.getJSON("http://my-card.in/users/me.json?name=" + name + "&password=" + password, function(data) {
      var domain, jid;
      bootbox.hideAll();
      $('#login_form button[type=submit]').removeAttr('disabled');
      if (data) {
        if (remember_me) {
          $.cookie('password', password, {
            expires: Number.MAX_VALUE,
            path: '/'
          });
          try {
            if (mycard_client) {
              mycard_client.send("auth=" + name + ":" + password);
            }
          } catch (_error) {}
        } else {
          $.cookie('password', password, {
            path: '/'
          });
          try {
            if (mycard_client) {
              mycard_client.send("auth=" + name);
            }
          } catch (_error) {}
        }
        if (name.indexOf('@') === -1) {
          jid = name + '@my-card.in';
          domain = 'my-card.in';
        } else {
          jid = name;
          name = jid.split('/')[0].split('@')[0];
          domain = jid.split('/')[0].split('@')[1];
        }
        $('#userinfo_name').text(name);
        $('#userinfo_avatar').attr('src', pre_load_photo(jid, name, domain));
        $('#candy').attr('src', "candy/index.html?bosh=http://localhost:5280/http-bind/&jid=" + (encodeURIComponent(jid)) + "&password=" + (encodeURIComponent(password)));
        $('.not-logged-in').hide();
        $('.logged-in').show();
        $(".lobby-page.login").slideUp();
        return $(".lobby-page.lobby").slideDown();
      } else {
        return bootbox.alert("用户名或密码错误");
      }
    }).error(function(jqXHR, textStatus, errorThrown) {
      bootbox.hideAll();
      return bootbox.alert(textStatus);
    });
    return false;
  };

  if ($.cookie('username') && $.cookie('password')) {
    login($.cookie('username'), $.cookie('password'));
  } else if ($.cookie('username')) {
    $('#login_form input[name=name]').val($.cookie('username'));
  }

  $('#login_form').submit(function() {
    return login(this.name.value, this.password.value);
  });

  $('#new_room_custom_button').click(function() {
    return $("#new_room_custom").slideToggle(400);
  });

  $("#new_room_button").click(function() {
    if (gui != null) {
      win = gui.Window.get();
      win.minimize();
    }
    return $("#new_room").submit();
  });

  default_room_names = (function() {
    _results = [];
    for (_i = 0; _i < 1000; _i++){ _results.push(_i); }
    return _results;
  }).apply(this);

  $.getJSON('https://my-card.in/cards_zh.json', {
    c: true,
    q: JSON.stringify({
      name: {
        $not: {
          $regex: "\\s"
        }
      }
    })
  }, function(count) {
    return $.getJSON('https://my-card.in/cards_zh.json', {
      f: JSON.stringify({
        _id: 0,
        name: 1
      }),
      q: JSON.stringify({
        name: {
          $not: {
            $regex: "\\s"
          }
        }
      }),
      l: 100,
      sk: _.random(count - 100)
    }, function(data) {
      return default_room_names = _.pluck(data, 'name');
    });
  });

  $('#new_room_modal').on('show.bs.modal', function() {
    return $("#new_room_name").val(_.sample(default_room_names));
  });

  $.getJSON('http://my-card.in/announcements.json', function(data) {
    var announcement, _j, _len, _ref, _results1;
    $('#announcements').empty();
    _ref = data.slice(0, 9);
    _results1 = [];
    for (_j = 0, _len = _ref.length; _j < _len; _j++) {
      announcement = _ref[_j];
      _results1.push($('<li/>').append($('<a/>', {
        href: announcement.url,
        text: announcement.title,
        "class": 'select'
      })).appendTo('#announcements'));
    }
    return _results1;
  });

  set_status = function(text) {
    if (!text) {
      text = "MyCard 版本: " + mycard_version;
      if (ygopro_version) {
        text += " / YGOPro 版本: " + (/^[a-fA-F0-9]{16}$/.test("ygopro_version") ? '未知' : ygopro_version);
      }
    }
    return $('.mycard_status').text(text);
  };

  mycard_client_connect = function(wait) {
    var connected;
    if (wait == null) {
      wait = 3;
    }
    connected = false;
    $('<iframe/>', {
      src: 'mycard:///',
      hidden: true
    }).appendTo('body');
    mycard_client = new WebSocket('ws://127.0.0.1:9998/');
    mycard_client.onopen = function(evt) {
      console.log("client connected");
      return connected = true;
    };
    mycard_client.onclose = function(evt) {
      console.log('client disconnected');
      if (!connected) {
        if (wait > 1) {
          return mycard_client_connect(wait - 1);
        } else {
          return bootbox.alert("启动本地客户端失败");
        }
      } else {
        $('.mycard_status').text('本地客户端连接中断, 正在重新连接...');
        return mycard_client_connect();
      }
    };
    return mycard_client.onmessage = function(evt) {
      var msg;
      msg = JSON.parse(evt.data);
      if (msg == null) {
        return;
      }
      if (msg.version != null) {
        mycard_version = msg.version;
        set_status();
      }
      if (msg.ygopro_version != null) {
        ygopro_version = msg.ygopro_version;
        set_status();
      }
      if (msg.images_download_images != null) {
        if (msg.images_download_images === 0 && msg.images_download_thumbnails === 0) {
          set_status();
        } else {
          set_status("正在下载卡图 缩略: " + msg.images_download_images + " 完整: " + msg.images_download_thumbnails + " 错误: " + msg.images_download_errors);
        }
      }
      if (msg.auth && !$.cookie('password')) {
        $.cookie('username', msg.auth.username);
        $.cookie('password', msg.auth.password);
        if ($.cookie('username') && $.cookie('password')) {
          return login($.cookie('username'), $.cookie('password'));
        } else if ($.cookie('username')) {
          return $('#login_form input[name=name]').val($.cookie('username'));
        }
      }
    };
  };

  set_status('Loading...');

  mycard_client_connect();

  $.get('http://www.duelist.cn/api/book/list?callback=?', function(data) {
    var duelist, _j, _len;
    $('#duelists').empty();
    for (_j = 0, _len = data.length; _j < _len; _j++) {
      duelist = data[_j];
      $('<li/>').append($('<a/>', {
        href: duelist.url,
        text: duelist.title,
        target: 'browser',
        "class": 'duelist'
      })).appendTo('#duelists');
    }
    return $('.duelist').click(function() {
      if ($('.lobby-page.web').is(":visible")) {
        $('#browser').data('url', this.href);
        return true;
      }
      $('#nav .active').removeClass('active');
      $('#duelists_nav').addClass('active');
      $('.lobby-page:visible').slideUp();
      if ($('#browser').data('url') === this.href) {
        $('.lobby-page.web').slideDown();
        return false;
      } else {
        $('#browser').data('url', this.href);
        $('.lobby-page.web').slideDown();
        return true;
      }
    });
  }, 'jsonp');

  $('#forum_nav a').click(function() {
    if ($('.lobby-page.forum').is(":visible")) {
      return false;
    }
    $('#nav .active').removeClass('active');
    $('#forum_nav').addClass('active');
    $('.lobby-page:visible').slideUp();
    $('.lobby-page.forum').slideDown();
    return false;
  });

  $('#lobby_nav a').click(function() {
    if ($('.lobby-page.lobby').is(":visible")) {
      return false;
    }
    $('#nav .active').removeClass('active');
    $('#lobby_nav').addClass('active');
    $('.lobby-page:visible').slideUp();
    $('.lobby-page.lobby').slideDown();
    return false;
  });

  $("#cards_search").typeahead({
    name: 'ourocg',
    remote: {
      url: 'http://www.ourocg.cn/Suggest.aspx?&key=%QUERY',
      dataType: "jsonp",
      beforeSend: function(jqXhr, settings) {
        return window.sc = {
          cb: function(data) {
            return window[settings.jsonpCallback](data.result);
          }
        };
      },
      cache: true
    }
  });

  cards_search = function() {
    if ($('.lobby-page.cards').is(":visible")) {
      return true;
    }
    $('#nav .active').removeClass('active');
    $('.lobby-page:visible').slideUp();
    $('.lobby-page.cards').slideDown();
    return true;
  };

  $("#cards").on('load', function() {
    return $("#cards").attr('scrollTop', 219);
  });

  $('#cards_nav').submit(cards_search);

  $('a[target=cards]').click(cards_search);

  $("#cards_search").on('typeahead:selected', function(event, item) {
    return $("#cards_nav").submit();
  });

  $('#logout').click(function() {
    $.removeCookie('password', {
      path: '/'
    });
    $('.logged-in').hide();
    $('.not-logged-in').show();
    $('.lobby-page:visible').slideUp();
    $('.lobby-page.login').slideDown();
    return false;
  });

  $('#match').click(function() {
    bootbox.dialog({
      message: '正在等待对手...'
    });
    return $.ajax("https://my-card.in/match", {
      username: $.cookie('username'),
      password: $.cookie('password')
    }).done(function(data) {
      bootbox.hideAll();
      return mycard_client.send(data);
    }).fail(function(jqXHR, textStatus, errorThrown) {
      bootbox.hideAll();
      return bootbox.alert(errorThrown);
    });
  });

  $('#roster').on('click', '.xmpp', function() {
    var candy;
    candy = $('#candy')[0];
    return candy.contentWindow.postMessage({
      type: 'chat',
      jid: $(this).data('jid')
    }, candy.src);
  });

  window.addEventListener('message', function(event) {
    var barefrom, binval, candy, domain, element, from, jid, msg, name, photo, photo_hash, pres, show, stanza, status, type;
    msg = event.data;
    switch (msg.type) {
      case 'vcard':
        stanza = $(msg.stanza);
        photo = stanza.find('photo');
        if (photo.length === 0) {
          return;
        }
        from = stanza.attr('from');
        type = photo.find('type').text();
        binval = photo.find('binval').text();
        return $(".xmpp[data-jid=\"" + from + "\"] > .photo").attr('src', "data:" + type + ";base64," + binval);
      case 'roster':
        return $('#roster').empty().append((function() {
          var _j, _len, _ref, _ref1, _results1;
          _ref = $(msg.stanza).find('query[xmlns="jabber:iq:roster"] > item');
          _results1 = [];
          for (_j = 0, _len = _ref.length; _j < _len; _j++) {
            element = _ref[_j];
            jid = element.getAttribute('jid');
            name = (_ref1 = element.getAttribute('name')) != null ? _ref1 : jid.split('@', 2)[0];
            domain = jid.split('/')[0].split('@', 2)[1];
            _results1.push($('<li/>', {
              "class": 'xmpp',
              'data-jid': jid,
              'data-name': name,
              'data-subcription': element.getAttribute('subcription'),
              'data-presence-type': 'unavailable'
            }).append([
              $('<img/>', {
                src: pre_load_photo(jid, name, domain),
                "class": 'photo',
                onerror: "this.src='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='"
              }), $('<span/>', {
                text: name
              })
            ]));
          }
          return _results1;
        })());
      case 'roster_set':
        return $(msg.stanza).find('query[xmlns="jabber:iq:roster"] > item').each(function(index, element) {
          var _ref;
          jid = element.getAttribute('jid');
          name = (_ref = element.getAttribute('name')) != null ? _ref : jid.split('@', 2)[0];
          domain = jid.split('/')[0].split('@', 2)[1];
          if ($(".xmpp[data-jid=\"" + jid + "\"]").length === 0) {
            return $('#roster').prepend($('<li/>', {
              "class": 'xmpp',
              'data-jid': jid,
              'data-name': name,
              'data-subcription': element.getAttribute('subcription'),
              'data-presence-type': 'unavailable'
            }).append([
              $('<img/>', {
                src: pre_load_photo(jid, name, domain),
                "class": 'photo',
                onerror: "this.src='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='"
              }), $('<span/>', {
                text: name
              })
            ]));
          } else {
            return $(".xmpp[data-jid=\"" + jid + "\"]").replaceWith($('<li/>', {
              "class": 'xmpp',
              'data-jid': jid,
              'data-name': name,
              'data-subcription': element.getAttribute('subcription'),
              'data-presence-type': 'unavailable'
            }).append([
              $('<img/>', {
                src: pre_load_photo(jid, name, domain),
                "class": 'photo',
                onerror: "this.src='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='"
              }), $('<span/>', {
                text: name
              })
            ]));
          }
        });
      case 'presence':
        stanza = $(msg.stanza);
        from = stanza.attr('from');
        type = stanza.attr('type');
        barefrom = from.split('/', 2)[0];
        switch (type) {
          case "subscribe":
            if ($(".xmpp[data-jid=\"" + barefrom + "\"]").length !== 0) {
              candy = $('#candy')[0];
              return candy.contentWindow.postMessage({
                type: 'subscribed',
                jid: barefrom
              }, candy.src);
            } else {
              return noty({
                text: "" + barefrom + " 想要将您添加为好友, 同意吗?",
                layout: 'topRight',
                buttons: [
                  {
                    addClass: "btn btn-primary",
                    text: "同意",
                    onClick: function($noty) {
                      candy = $('#candy')[0];
                      candy.contentWindow.postMessage({
                        type: 'subscribed',
                        jid: barefrom
                      }, candy.src);
                      candy.contentWindow.postMessage({
                        type: 'subscribe',
                        jid: barefrom
                      }, candy.src);
                      return $noty.close();
                    }
                  }, {
                    addClass: "btn btn-danger",
                    text: "拒绝",
                    onClick: function($noty) {
                      candy = $('#candy')[0];
                      candy.contentWindow.postMessage({
                        type: 'unsubscribed',
                        jid: barefrom
                      }, candy.src);
                      return $noty.close();
                    }
                  }
                ]
              });
            }
            break;
          case "subscribed":
            return noty({
              text: "" + barefrom + " 同意了您的添加好友请求.",
              layout: 'topRight'
            });
          case "unsubscribed":
            return noty({
              text: "" + barefrom + " 不再是您的好友了.",
              layout: 'topRight'
            });
          default:
            photo_hash = stanza.find('x[xmlns="vcard-temp:x:update"] photo').text();
            if (photo_hash != null) {
              candy = $('#candy')[0];
              candy.contentWindow.postMessage({
                type: 'vcard',
                jid: barefrom
              }, candy.src);
            }
            pres = type || "available";
            show = stanza.find("show")[0];
            if (show) {
              pres = show.textContent;
            }
            status = stanza.find("status")[0];
            if (status) {
              pres += ":" + status.textContent;
            }
            return $(".xmpp[data-jid=\"" + barefrom + "\"]").attr('data-presence-type', type || 'available');
        }
    }
  });

  $("#roster_search").submit(function() {
    var candy, jid;
    if (this.name.value.indexOf('@') === -1) {
      jid = this.name.value + '@my-card.in';
    } else {
      jid = this.name.value;
    }
    candy = $('#candy')[0];
    candy.contentWindow.postMessage({
      type: 'subscribe',
      jid: jid
    }, candy.src);
    return false;
  });

  $('#lobby_wrap .tab-pane').on('shown.bs.tab', function(event) {
    return $('#back').show();
  });

  $('#back').on('shown.bs.tab', function(event) {
    return $('#back').hide();
  });

  /*
  $.getJSON 'https://api.github.com/repos/mycard/mycard/issues', (data)->
    for issue in data
      element = $('<li/>', class: 'list-group-item').append($('<a/>', href:issue.html_url, text: issue.title, target: '_blank'))
      labels = $('<span/>', class: 'labels pull-right')
      for label in issue.labels
        labels.append $('<span/>',class: 'label', text: label.name, style: "background-color: ##{label.color}")
      element.append labels
      element.appendTo '#issues'
  */


  room_template = Hogan.compile($('#room_template').html());

  render_room = function(room) {
    var player, _j, _k, _len, _len1, _ref, _ref1;
    room = $.extend({
      rule: 0,
      mode: 0,
      enable_priority: false,
      no_check_deck: false,
      no_shuffle_deck: false,
      start_lp: 8000,
      start_hand: 5,
      draw_count: 1
    }, room);
    room['match?'] = room.mode === 1;
    room['tag?'] = room.mode === 2;
    room['start?'] = room.status === 'start';
    room['origin_name'] = mycard.room_name(room.name, null, false, room.rule, room.mode, room.start_lp, room.start_hand, room.draw_count);
    _ref = room.users;
    for (_j = 0, _len = _ref.length; _j < _len; _j++) {
      player = _ref[_j];
      room["player_" + player.player] = player.id;
    }
    _ref1 = room.users;
    for (_k = 0, _len1 = _ref1.length; _k < _len1; _k++) {
      player = _ref1[_k];
      if ($(".xmpp[data-name=\"" + player.id + "\"]").length) {
        room['avatar?'] = true;
        break;
      }
    }
    return room_template.render(room);
  };

  rooms_connect = function() {
    var connected, websocket, wsServer,
      _this = this;
    connected = false;
    $('#new_room_placeholder').nextAll().replaceWith($('<p/>', {
      text: '正在连接...'
    }));
    wsServer = 'wss://my-card.in/rooms.json';
    websocket = new WebSocket(wsServer);
    websocket.onopen = function() {
      $('#new_room_placeholder').nextAll().replaceWith($('<p/>', {
        text: '正在读取房间列表...'
      }));
      return console.log("websocket: Connected to WebSocket server.");
    };
    websocket.onclose = function(evt) {
      $('#new_room_placeholder').nextAll().remove().replaceWith($('<p/>', {
        text: '大厅连接中断, '
      }).append($('<a />', {
        id: 'reconnect',
        text: '重新连接'
      })));
      $('#reconnect').click(rooms_connect);
      return console.log("websocket: Disconnected");
    };
    websocket.onmessage = function(evt) {
      var element, room, rooms, _j, _len;
      rooms = JSON.parse(evt.data);
      rooms = (function() {
        var _j, _len, _results1;
        _results1 = [];
        for (_j = 0, _len = rooms.length; _j < _len; _j++) {
          room = rooms[_j];
          if (!room["private"]) {
            _results1.push(room);
          }
        }
        return _results1;
      })();
      if (connected) {
        for (_j = 0, _len = rooms.length; _j < _len; _j++) {
          room = rooms[_j];
          if (room.status === 'start') {
            room._deleted = true;
          }
          if (room._deleted) {
            $("#room_" + room.id).hide('fast', function() {
              return $("#room_" + room.id).remove();
            });
          } else {
            element = $("#room_" + room.id);
            if (element.length) {
              element.replaceWith(render_room(room));
            } else {
              $(render_room(room)).hide().insertAfter('#new_room_placeholder').show('fast');
            }
          }
        }
      } else {
        $('#new_room_placeholder').nextAll().remove().replaceWith((function() {
          var _k, _len1, _results1;
          _results1 = [];
          for (_k = 0, _len1 = rooms.length; _k < _len1; _k++) {
            room = rooms[_k];
            if (room.status !== 'start') {
              _results1.push(render_room(room));
            }
          }
          return _results1;
        })());
      }
      return connected = true;
    };
    return websocket.onerror = function(evt) {
      return console.log('websocket: Error occured: ' + evt.data);
    };
  };

  $('#new_room_placeholder').nextAll().remove();

  $('#new_room_placeholder').after($('<p/>', {
    text: '正在读取服务器列表...'
  }));

  servers = {};

  $.getJSON("https://my-card.in/servers.json", function(data) {
    var server, _j, _len;
    for (_j = 0, _len = data.length; _j < _len; _j++) {
      server = data[_j];
      servers[server.id] = server;
    }
    rooms_connect();
    $("#new_room").submit(function() {
      var room_name;
      room_name = mycard.room_name(this.name.value, null, false, (this.ocg.checked ? (this.tcg.checked ? 2 : 0) : this.tcg.checked ? 1 : 4), parseInt($(this).find('input[name=mode]:checked').val()), parseInt(this.start_lp.value), parseInt(this.start_hand.value), parseInt(this.draw_count.value), this.enable_priority.checked, this.no_check_deck.checked, this.no_shuffle_deck.checked);
      server = _.sample(_.values(servers));
      mycard_client.send(mycard.room_url_mycard(server.ip, server.port, room_name, $.cookie('username'), $.cookie('password'), false, false));
      return false;
    });
    if (gui != null) {
      return $("#new_room_share_button").click(function() {
        var clipboard, form, room_name, room_url;
        form = $("#new_room")[0];
        room_name = mycard.room_name(form.name.value, _.random(0, 999), false, (form.ocg.checked ? (form.tcg.checked ? 2 : 0) : form.tcg.checked ? 1 : 4), parseInt($(form).find('input[name=mode]:checked').val()), parseInt(form.start_lp.value), parseInt(form.start_hand.value), parseInt(form.draw_count.value), form.enable_priority.checked, form.no_check_deck.checked, form.no_shuffle_deck.checked);
        server = _.sample(_.values(servers));
        mycard_client.send(mycard.room_url_mycard(server.ip, server.port, room_name, $.cookie('username'), $.cookie('password'), false, false));
        room_url = mycard.room_url(server.ip, server.port, room_name, null, null, false, false);
        clipboard = gui.Clipboard.get();
        clipboard.set(room_url, "text");
        return bootbox.alert("房间地址已复制到剪贴板");
      });
    } else {
      return $('#new_room_modal').one('shown.bs.modal', function() {
        return $('#new_room_share_button').zclip({
          path: 'js/ZeroClipboard.swf',
          copy: function() {
            var form, room_name, room_url;
            form = $("#new_room")[0];
            room_name = mycard.room_name(form.name.value, _.random(0, 999), false, (form.ocg.checked ? (form.tcg.checked ? 2 : 0) : form.tcg.checked ? 1 : 4), parseInt($(form).find('input[name=mode]:checked').val()), parseInt(form.start_lp.value), parseInt(form.start_hand.value), parseInt(form.draw_count.value), form.enable_priority.checked, form.no_check_deck.checked, form.no_shuffle_deck.checked);
            server = _.sample(_.values(servers));
            mycard_client.send(mycard.room_url_mycard(server.ip, server.port, room_name, $.cookie('username'), $.cookie('password'), false, false));
            return room_url = mycard.room_url(server.ip, server.port, room_name, null, null, false, false);
          },
          afterCopy: function() {
            $('#new_room_modal').modal('hide');
            return bootbox.alert('房间地址已复制到剪贴板');
          }
        });
      });
    }
  });

  /*
  does not work
  http://stackoverflow.com/a/11052002
  $('#rooms').on  'error', 'img', (event)->
    console.log event, this
    this.src = 'img/avatar_error_small.png'
  */


  $('#rooms').on('click', '.room.wait', function(event) {
    var server;
    server = servers[parseInt($(this).data('server-id'))];
    mycard_client.send(mycard.room_url_mycard(server.ip, server.port, $(this).data('origin-name'), $.cookie('username'), $.cookie('password'), false, false));
    if (gui != null) {
      win = gui.Window.get();
      return win.minimize();
    }
  });

  $('#config_modal').one('shown.bs.modal', function() {
    return $('.slider').slider();
  });

  $('#deck_edit').click(function() {
    return mycard_client.send('deck');
  });

  $.getJSON('http://my-card.in/users/top.json', {
    limit: 7
  }, function(data) {
    var index, user;
    return $('#users_top').append((function() {
      var _results1;
      _results1 = [];
      for (index in data) {
        user = data[index];
        _results1.push($('<tr/>').append([
          $('<td/>', {
            text: parseInt(index) + 1
          }), $('<td/>', {
            text: user.name
          }), $('<td/>', {
            text: user.points
          })
        ]));
      }
      return _results1;
    })());
  });

}).call(this);

/*
//@ sourceMappingURL=lobby.map
*/
