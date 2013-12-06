mycard_version = null
ygopro_version = null
mycard_client = null

if $('html').hasClass('gui')
  gui = require('nw.gui')

  win = gui.Window.get();
  $('#window_control_minimize').click ->
    win.minimize()
  $('#window_control_maximize').click ->
    win.maximize()
  $('#window_control_unmaximize').click ->
    win.unmaximize()
  $('#window_control_close').click ->
    win.close()
  win.on 'maximize', ->
    $('#window_control_maximize').hide()
    $('#window_control_unmaximize').show()
  win.on 'unmaximize', ->
    $('#window_control_maximize').show()
    $('#window_control_unmaximize').hide()
  win.showDevTools()


  ###
  win.on 'focus', ->
    bootbox.alert('focus')
    $('html').removeClass 'blur'
  win.on 'blur', ->
    bootbox.alert('blur')
    $('html').addClass 'blur'
  ###

  $('body').on 'click', 'a[target=_blank]', ->
    gui.Shell.openExternal( this.href );
    return false;

pre_load_photo = (jid, name, domain)->
  switch domain
    when 'my-card.in'
      "http://my-card.in/users/#{name}.png"
    when 'public.talk.google.com'
      'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
    else
      hash = CryptoJS.MD5(jid);
      "http://en.gravatar.com/avatar/#{hash}?s=48&d=404"

nxb = require "node-xmpp-bosh"
xmpp_server = nxb.start_bosh
  host: "localhost"

login = (name, password, remember_me)->
  $.cookie 'username', name, expires: Number.MAX_VALUE, path: '/'
  bootbox.dialog message: '正在登录...'
  $('#login_form button[type=submit]').attr('disabled', 'disabled')
  $.getJSON "http://my-card.in/users/me.json?name=#{name}&password=#{password}", (data)->
    bootbox.hideAll()
    $('#login_form button[type=submit]').removeAttr('disabled')
    if data
      if remember_me
        $.cookie 'password', password, expires: Number.MAX_VALUE, path: '/'
        try
          mycard_client.send("auth=#{name}:#{password}") if mycard_client
      else
        $.cookie 'password', password, path: '/'
        try
          mycard_client.send("auth=#{name}") if mycard_client

      if name.indexOf('@') == -1 #mycard帐号
        jid = name + '@my-card.in'
        domain = 'my-card.in'
      else #xmpp帐号
        jid = name
        name = jid.split('/')[0].split('@')[0]
        domain = jid.split('/')[0].split('@')[1]

      $('#userinfo_name').text name
      $('#userinfo_avatar').attr 'src', pre_load_photo(jid, name, domain)
      $('#candy').attr 'src', "candy/index.html?bosh=http://localhost:5280/http-bind/&jid=#{encodeURIComponent jid}&password=#{encodeURIComponent password}"

      $('.not-logged-in').hide()
      $('.logged-in').show()

      $(".lobby-page.login").slideUp()
      $(".lobby-page.lobby").slideDown()
    else
      bootbox.alert "用户名或密码错误"
  .error (jqXHR, textStatus, errorThrown)->
      bootbox.hideAll()
      bootbox.alert textStatus
  false

if $.cookie('username') and $.cookie('password')
  login($.cookie('username'), $.cookie('password'))
else if $.cookie('username')
  $('#login_form input[name=name]').val $.cookie('username')

$('#login_form').submit ->
  login(@name.value, @password.value)

$('#new_room_custom_button').click ->
  $("#new_room_custom").slideToggle(400)

$("#new_room_button").click ->
  if gui?
    win = gui.Window.get();
    win.minimize();
  $("#new_room").submit()

default_room_names = [0...1000]

$.getJSON 'https://my-card.in/cards_zh.json',
  c: true
  q: JSON.stringify
    name:
      $not:
        $regex: "\\s"
, (count)->
  $.getJSON 'https://my-card.in/cards_zh.json',
    f: JSON.stringify
      _id:0
      name:1
    q: JSON.stringify
      name:
        $not:
          $regex: "\\s"
    l:100
    sk: _.random count - 100
  , (data)->
    default_room_names = _.pluck(data, 'name');

$('#new_room_modal').on 'show.bs.modal', ->
  $("#new_room_name").val _.sample default_room_names

$.getJSON 'http://my-card.in/announcements.json', (data)->
  $('#announcements').empty()
  for announcement in data[0...9]
    $('<li/>').append($('<a/>',
      href: announcement.url, text: announcement.title, class: 'select')).appendTo '#announcements'

set_status = (text)->
  if !text
    text = "MyCard 版本: #{mycard_version}"
    text += " / YGOPro 版本: #{if (/^[a-fA-F0-9]{16}$/).test("ygopro_version") then '未知' else ygopro_version}" if ygopro_version
  $('.mycard_status').text text

mycard_client_connect = (wait = 3)->
  connected = false
  $('<iframe/>', src: 'mycard:///', hidden: true).appendTo('body')

  mycard_client = new WebSocket 'ws://127.0.0.1:9998/'
  mycard_client.onopen = (evt)->
    console.log "client connected"
    connected = true

  mycard_client.onclose = (evt)->
    console.log 'client disconnected'
    if !connected #从没连上去过
      if wait > 1
        mycard_client_connect(wait - 1)
      else
        bootbox.alert("启动本地客户端失败")
    else
      $('.mycard_status').text '本地客户端连接中断, 正在重新连接...'
      mycard_client_connect()

  mycard_client.onmessage = (evt)->
    msg = JSON.parse evt.data
    return unless msg?
    if msg.version?
      mycard_version = msg.version
      set_status()
    if msg.ygopro_version?
      ygopro_version = msg.ygopro_version
      set_status()
    if msg.images_download_images?
      if msg.images_download_images == 0 and msg.images_download_thumbnails == 0
        set_status()
      else
        set_status("正在下载卡图 缩略: #{msg.images_download_images} 完整: #{msg.images_download_thumbnails} 错误: #{msg.images_download_errors}")
    if msg.auth and !$.cookie('password')
      $.cookie('username', msg.auth.username)
      $.cookie('password', msg.auth.password)
      if $.cookie('username') and $.cookie('password')
        login($.cookie('username'), $.cookie('password'))
      else if $.cookie('username')
        $('#login_form input[name=name]').val $.cookie('username')

set_status 'Loading...'
mycard_client_connect()

# duelist
$.get 'http://www.duelist.cn/api/book/list?callback=?', (data)->
  $('#duelists').empty()
  for duelist in data
    $('<li/>').append($('<a/>',
      href: duelist.url, text: duelist.title, target: 'browser', class: 'duelist')).appendTo('#duelists')
  $('.duelist').click ->
    if $('.lobby-page.web').is(":visible")
      $('#browser').data 'url', @href
      return true
    $('#nav .active').removeClass('active')
    $('#duelists_nav').addClass('active')
    $('.lobby-page:visible').slideUp()
    #如何防闪..
    if $('#browser').data('url') == @href
      $('.lobby-page.web').slideDown()
      false
    else
      $('#browser').data 'url', @href
      $('.lobby-page.web').slideDown()
      true
, 'jsonp'

$('#forum_nav a').click ->
  return false if $('.lobby-page.forum').is(":visible")
  $('#nav .active').removeClass('active')
  $('#forum_nav').addClass('active')
  $('.lobby-page:visible').slideUp()
  $('.lobby-page.forum').slideDown()
  false
$('#lobby_nav a').click ->
  return false if $('.lobby-page.lobby').is(":visible")
  $('#nav .active').removeClass('active')
  $('#lobby_nav').addClass('active')
  $('.lobby-page:visible').slideUp()
  $('.lobby-page.lobby').slideDown()
  false

$("#cards_search").typeahead
  name: 'ourocg'
  remote:
    url: 'http://www.ourocg.cn/Suggest.aspx?&key=%QUERY'
    dataType: "jsonp"
    beforeSend: (jqXhr, settings)->
      window.sc =
        cb: (data)->
          window[settings.jsonpCallback] data.result
    cache: true

cards_search = ->
  return true if $('.lobby-page.cards').is(":visible")
  $('#nav .active').removeClass('active')
  $('.lobby-page:visible').slideUp()
  $('.lobby-page.cards').slideDown()
  true

$("#cards").on 'load', ->
  $("#cards").attr 'scrollTop', 219

$('#cards_nav').submit cards_search
$('a[target=cards]').click cards_search

$("#cards_search").on 'typeahead:selected', (event, item)->
  $("#cards_nav").submit()

$('#logout').click ->
  $.removeCookie 'password', path: '/'
  $('.logged-in').hide()
  $('.not-logged-in').show()

  $('.lobby-page:visible').slideUp()
  $('.lobby-page.login').slideDown()
  false

$('#match').click ->
  bootbox.dialog message: '正在等待对手...'
  $.ajax "https://my-card.in/match",
    username: $.cookie('username')
    password: $.cookie('password')
  .done (data)->
      bootbox.hideAll()
      mycard_client.send data
  .fail (jqXHR, textStatus, errorThrown)->
      bootbox.hideAll()
      bootbox.alert errorThrown

$('#roster').on 'click', '.xmpp', ->
  candy = $('#candy')[0]
  candy.contentWindow.postMessage type: 'chat', jid: $(this).data('jid'), candy.src

window.addEventListener 'message', (event)->
  msg = event.data
  #console.log msg.stanza
  switch msg.type
    when 'vcard'
      stanza = $(msg.stanza)
      photo = stanza.find('photo')
      return if photo.length == 0
      from = stanza.attr('from');
      type = photo.find('type').text()
      binval = photo.find('binval').text()
      $(".xmpp[data-jid=\"#{from}\"] > .photo").attr('src', "data:#{type};base64,#{binval}")
    when 'roster'
      $('#roster').empty().append (for element in $(msg.stanza).find('query[xmlns="jabber:iq:roster"] > item')
        jid = element.getAttribute('jid')
        name = element.getAttribute('name') ? jid.split('@',2)[0]
        domain = jid.split('/')[0].split('@',2)[1]
        $('<li/>', class: 'xmpp', 'data-jid': jid, 'data-name': name, 'data-subcription': element.getAttribute('subcription'), 'data-presence-type': 'unavailable').append([
          $('<img/>', src: pre_load_photo(jid, name, domain), class: 'photo', onerror: "this.src='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='")
          $('<span/>', text: name)
        ]))
    when 'roster_set'
      $(msg.stanza).find('query[xmlns="jabber:iq:roster"] > item').each (index, element)->
        jid = element.getAttribute('jid')
        name = element.getAttribute('name') ? jid.split('@',2)[0]
        domain = jid.split('/')[0].split('@',2)[1]
        if $(".xmpp[data-jid=\"#{jid}\"]").length == 0
          $('#roster').prepend $('<li/>', class: 'xmpp', 'data-jid': jid, 'data-name': name, 'data-subcription': element.getAttribute('subcription'), 'data-presence-type': 'unavailable').append([
            $('<img/>', src: pre_load_photo(jid, name, domain), class: 'photo', onerror: "this.src='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='")
            $('<span/>', text: name)
          ])
        else
          $(".xmpp[data-jid=\"#{jid}\"]").replaceWith $('<li/>', class: 'xmpp', 'data-jid': jid, 'data-name': name, 'data-subcription': element.getAttribute('subcription'), 'data-presence-type': 'unavailable').append([
            $('<img/>', src: pre_load_photo(jid, name, domain), class: 'photo', onerror: "this.src='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='")
            $('<span/>', text: name)
          ])


    when 'presence'
      stanza = $(msg.stanza)
      from = stanza.attr('from');
      type = stanza.attr('type')
      barefrom = from.split('/',2)[0];

      switch type
        when "subscribe"
          if $(".xmpp[data-jid=\"#{barefrom}\"]").length != 0 #自动同意已经在好友列表里的
            candy = $('#candy')[0]
            candy.contentWindow.postMessage type: 'subscribed', jid: barefrom, candy.src #同意好友申请
          else
            noty
              text: "#{barefrom} 想要将您添加为好友, 同意吗?"
              layout: 'topRight',
              buttons: [
                addClass: "btn btn-primary"
                text: "同意"
                onClick: ($noty) ->
                  candy = $('#candy')[0]
                  candy.contentWindow.postMessage type: 'subscribed', jid: barefrom, candy.src #同意好友申请
                  candy.contentWindow.postMessage type: 'subscribe', jid: barefrom, candy.src #添加对方为好友
                  $noty.close()
              ,
                addClass: "btn btn-danger"
                text: "拒绝"
                onClick: ($noty) ->
                  candy = $('#candy')[0]
                  candy.contentWindow.postMessage type: 'unsubscribed', jid: barefrom, candy.src
                  $noty.close()
              ]
        when "subscribed"
          noty
            text: "#{barefrom} 同意了您的添加好友请求."
            layout: 'topRight',
        when "unsubscribed"
          noty
            text: "#{barefrom} 不再是您的好友了."
            layout: 'topRight'
        else
          photo_hash = stanza.find('x[xmlns="vcard-temp:x:update"] photo').text()
          if photo_hash?
            candy = $('#candy')[0]
            candy.contentWindow.postMessage type: 'vcard', jid: barefrom, candy.src

          pres = type or "available"
          show = stanza.find("show")[0]
          pres = show.textContent  if show
          status = stanza.find("status")[0]
          pres += ":" + status.textContent  if status
          #roster.add new Candy.Core.ChatUser(barefrom, pres)
          $(".xmpp[data-jid=\"#{barefrom}\"]").attr('data-presence-type', type or 'available')

$("#roster_search").submit ->
  if @name.value.indexOf('@') == -1 #name
    jid = @name.value + '@my-card.in'
  else
    jid = @name.value

  candy = $('#candy')[0]
  candy.contentWindow.postMessage type: 'subscribe', jid: jid, candy.src
  false



$('#lobby_wrap .tab-pane').on 'shown.bs.tab', (event)->
  $('#back').show()

$('#back').on 'shown.bs.tab', (event)->
  $('#back').hide()

###
$.getJSON 'https://api.github.com/repos/mycard/mycard/issues', (data)->
  for issue in data
    element = $('<li/>', class: 'list-group-item').append($('<a/>', href:issue.html_url, text: issue.title, target: '_blank'))
    labels = $('<span/>', class: 'labels pull-right')
    for label in issue.labels
      labels.append $('<span/>',class: 'label', text: label.name, style: "background-color: ##{label.color}")
    element.append labels
    element.appendTo '#issues'
###

room_template = Hogan.compile $('#room_template').html()
render_room = (room)->
  room = $.extend({rule: 0, mode: 0, enable_priority: false, no_check_deck: false, no_shuffle_deck: false,start_lp: 8000, start_hand: 5, draw_count: 1}, room)
  room['match?'] = room.mode == 1
  room['tag?'] = room.mode == 2
  room['start?'] = room.status == 'start'
  room['origin_name'] = mycard.room_name(room.name, null, false, room.rule, room.mode, room.start_lp, room.start_hand, room.draw_count)

  for player in room.users
    room["player_#{player.player}"] = player.id

  for player in room.users
    if $(".xmpp[data-name=\"#{player.id}\"]").length
      room['avatar?'] = true
      break

  room_template.render(room)

rooms_connect = ->
  connected = false
  $('#new_room_placeholder').nextAll().replaceWith $('<p/>',text: '正在连接...')
  wsServer = 'wss://my-card.in/rooms.json'
  websocket = new WebSocket(wsServer);
  websocket.onopen = ->
    $('#new_room_placeholder').nextAll().replaceWith $('<p/>',text: '正在读取房间列表...')
    console.log("websocket: Connected to WebSocket server.")
  websocket.onclose = (evt)=>
    $('#new_room_placeholder').nextAll().remove().replaceWith $('<p/>',text: '大厅连接中断, ').append($('<a />', id: 'reconnect', text: '重新连接'))
    $('#reconnect').click rooms_connect
    console.log("websocket: Disconnected");
  websocket.onmessage = (evt)->
    rooms = JSON.parse(evt.data)
    rooms = (room for room in rooms when !room.private)
    if connected
      for room in rooms
        if room.status == 'start'
          room._deleted = true
        if room._deleted
          $("#room_#{room.id}").hide 'fast', ->
            $("#room_#{room.id}").remove()
        else
          element = $("#room_#{room.id}")
          if element.length
            element.replaceWith render_room(room)
          else
            $(render_room(room)).hide().insertAfter('#new_room_placeholder').show('fast')
    else
      $('#new_room_placeholder').nextAll().remove().replaceWith (render_room(room) for room in rooms when room.status != 'start')

    connected = true
  websocket.onerror = (evt)->
    console.log('websocket: Error occured: ' + evt.data);

$('#new_room_placeholder').nextAll().remove()
$('#new_room_placeholder').after $('<p/>',text: '正在读取服务器列表...')
servers = {}
$.getJSON "https://my-card.in/servers.json", (data)->
  for server in data
    servers[server.id] = server
  rooms_connect()
  $("#new_room").submit ->
    room_name = mycard.room_name(@name.value, null, false,
      (if @ocg.checked then (if @tcg.checked then 2 else 0) else if @tcg.checked then 1 else 4),
      parseInt($(this).find('input[name=mode]:checked').val()), parseInt(@start_lp.value), parseInt(@start_hand.value),
      parseInt(@draw_count.value), @enable_priority.checked, @no_check_deck.checked, @no_shuffle_deck.checked)
    server = _.sample _.values servers
    mycard_client.send mycard.room_url_mycard(server.ip, server.port, room_name, $.cookie('username'), $.cookie('password'), false, false)
    false

  if gui?
    $("#new_room_share_button").click ->
      form = $("#new_room")[0]
      room_name = mycard.room_name(form.name.value, _.random(0, 999), false,
        (if form.ocg.checked then (if form.tcg.checked then 2 else 0) else if form.tcg.checked then 1 else 4),
        parseInt($(form).find('input[name=mode]:checked').val()), parseInt(form.start_lp.value),
        parseInt(form.start_hand.value), parseInt(form.draw_count.value), form.enable_priority.checked,
        form.no_check_deck.checked, form.no_shuffle_deck.checked)
      server = _.sample _.values servers
      mycard_client.send mycard.room_url_mycard(server.ip, server.port, room_name, $.cookie('username'), $.cookie('password'), false, false)
      room_url = mycard.room_url(server.ip, server.port, room_name, null, null, false, false)
      clipboard = gui.Clipboard.get()
      clipboard.set room_url, "text"
      bootbox.alert("房间地址已复制到剪贴板")
  else
    $('#new_room_modal').one 'shown.bs.modal', ->
      $('#new_room_share_button').zclip
        path: 'js/ZeroClipboard.swf',
        copy: ->
          form = $("#new_room")[0]
          room_name = mycard.room_name(form.name.value, _.random(0, 999), false,
            (if form.ocg.checked then (if form.tcg.checked then 2 else 0) else if form.tcg.checked then 1 else 4),
            parseInt($(form).find('input[name=mode]:checked').val()), parseInt(form.start_lp.value),
            parseInt(form.start_hand.value), parseInt(form.draw_count.value), form.enable_priority.checked,
            form.no_check_deck.checked, form.no_shuffle_deck.checked)
          server = _.sample _.values servers
          mycard_client.send mycard.room_url_mycard(server.ip, server.port, room_name, $.cookie('username'), $.cookie('password'), false, false)
          room_url = mycard.room_url(server.ip, server.port, room_name, null, null, false, false)
        afterCopy: ->
          $('#new_room_modal').modal('hide')
          bootbox.alert '房间地址已复制到剪贴板'

###
does not work
http://stackoverflow.com/a/11052002
$('#rooms').on  'error', 'img', (event)->
  console.log event, this
  this.src = 'img/avatar_error_small.png'

###
$('#rooms').on 'click', '.room.wait', (event)->
  server = servers[parseInt($(this).data('server-id'))]
  mycard_client.send mycard.room_url_mycard(server.ip, server.port, $(this).data('origin-name'), $.cookie('username'), $.cookie('password'), false, false)
  if gui?
    win = gui.Window.get();
    win.minimize();

$('#config_modal').one 'shown.bs.modal', ->
  $('.slider').slider()

$('#deck_edit').click ->
  mycard_client.send 'deck'

$.getJSON 'http://my-card.in/users/top.json',
  limit: 7
,(data)->
  $('#users_top').append (for index, user of data
      $('<tr/>').append([
        $('<td/>', text: parseInt(index)+1),
        $('<td/>', text: user.name),
        $('<td/>', text: user.points),
      ]))
