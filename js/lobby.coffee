mycard_version = null
ygopro_version = null
mycard_client = null

if require?
  gui = require('nw.gui')
  $('html').addClass('gui')

  maximized = false
  win = gui.Window.get();
  $('#window_control_minimize').click ->
    win.minimize()
  $('#window_control_maximize').click -> if maximized then win.unmaximize() else win.maximize()
  $('#window_control_close').click ->
    win.close()
  win.on 'maximize', ->
    maximized = true
  win.on 'unmaximize', ->
    maximized = false
  ###
  win.on 'focus', ->
    bootbox.alert('focus')
    $('html').removeClass 'blur'
  win.on 'blur', ->
    bootbox.alert('blur')
    $('html').addClass 'blur'
  ###
  $('html').addClass 'blur'

pre_load_photo = (jid, name, domain)->
  switch domain
    when 'my-card.in'
      "http://my-card.in/users/#{name}.png"
    when 'public.talk.google.com'
      'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
    else
      hash = CryptoJS.MD5(jid);
      "http://en.gravatar.com/avatar/#{hash}?s=48&d=404"


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
      else
        $.cookie 'password', password, path: '/'

      if name.indexOf('@') == -1 #mycard帐号
        jid = name + '@my-card.in'
        domain = 'my-card.in'
      else #xmpp帐号
        jid = name
        name = jid.split('/')[0].split('@')[0]
        domain = jid.split('/')[0].split('@')[1]

      $('#userinfo_name').text name
      $('#userinfo_avatar').attr 'src', pre_load_photo(jid, name, domain)
      $('#candy').attr 'src', "candy/index.html?jid=#{encodeURIComponent jid}&password=#{encodeURIComponent password}"

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

$("#new_room").submit ->
  room_name = mycard.room_name(@name.value, @password.value, false,
    (if @ocg.checked then (if @tcg.checked then 2 else 0) else if @tcg.checked then 1 else 4),
    parseInt($(this).find('input[name=mode]:checked').val()), parseInt(@start_lp.value), parseInt(@start_hand.value),
    parseInt(@draw_count.value), @enable_priority.checked, @no_check_deck.checked, @no_shuffle_deck.checked)
  mycard_client.send mycard.room_url_mycard("122.0.65.70", 7911, room_name, "zh99998", "zh112998", false, false)
  false

$("#new_room_button").click ->
  if gui?
    win = gui.Window.get();
    win.minimize();
  $("#new_room").submit()

if gui?
  $("#new_room_share_button").click ->
    form = $("#new_room")[0]
    room_name = mycard.room_name(form.name.value, form.password.value, false,
      (if form.ocg.checked then (if form.tcg.checked then 2 else 0) else if form.tcg.checked then 1 else 4),
      parseInt($(form).find('input[name=mode]:checked').val()), parseInt(form.start_lp.value),
      parseInt(form.start_hand.value), parseInt(form.draw_count.value), form.enable_priority.checked,
      form.no_check_deck.checked, form.no_shuffle_deck.checked)
    room_url = mycard.room_url("122.0.65.70", 7911, room_name, null, null, false, true)
    clipboard = gui.Clipboard.get()
    clipboard.set room_url, "text"
    bootbox.alert("房间地址已复制到剪贴板")
    $("#new_room").submit()
else
  $('#new_room_modal').one 'shown.bs.modal', ->
    $('#new_room_share_button').zclip
      path: 'js/ZeroClipboard.swf',
      copy: ->
        form = $("#new_room")[0]
        room_name = mycard.room_name(form.name.value, form.password.value, false,
          (if form.ocg.checked then (if form.tcg.checked then 2 else 0) else if form.tcg.checked then 1 else 4),
          parseInt($(form).find('input[name=mode]:checked').val()), parseInt(form.start_lp.value),
          parseInt(form.start_hand.value), parseInt(form.draw_count.value), form.enable_priority.checked,
          form.no_check_deck.checked, form.no_shuffle_deck.checked)
        room_url = mycard.room_url("122.0.65.70", 7911, room_name, null, null, false, true)
      afterCopy: ->
        $('#new_room_modal').modal('hide')
        bootbox.alert '房间地址已复制到剪贴板'
        $("#new_room").submit()

$('#new_room_modal').on 'show.bs.modal', ->
  $("#new_room_name").val(Math.floor(Math.random() * 1000))

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
    console.log '连接关闭'
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
  $.get "http://122.0.65.69:9997/match.json", (data)->
    bootbox.hideAll()
    mycard_client.send data
  .error (jqXHR, textStatus, errorThrown)->
    bootbox.hideAll()
    bootbox.alert textStatus

$('#roster').on 'click', '.xmpp', ->
  candy = $('#candy')[0]
  candy.contentWindow.postMessage type: 'chat', jid: $(this).data('jid'), candy.src

#login('zh99998', 'zh112998')

window.addEventListener 'message', (event)->
  msg = event.data
  console.log "received message", msg
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
      console.log(1, msg.stanza)
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
          console.log type
          $(".xmpp[data-jid=\"#{barefrom}\"]").attr('data-presence-type', type or 'available')

$("#roster_search").submit ->
  if @name.value.indexOf('@') == -1 #name
    jid = @name.value + '@my-card.in'
  else
    jid = @name.value

  candy = $('#candy')[0]
  candy.contentWindow.postMessage type: 'subscribe', jid: jid, candy.src
  false

default_room_names = [0...1000]

$.getJSON "http://my-card.in/cards_zh.json?f={'name':1,'_id':0}", (data)->
  default_room_names = data[Math.floor(Math.random() * data.length)].name

$("#lobby_wrap")