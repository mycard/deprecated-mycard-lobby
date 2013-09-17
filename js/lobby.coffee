$('#login_form').submit ->
  bootbox.dialog message: '正在登录...'
  $('#login_form button[type=submit]').attr('disabled','disabled')
  false

$.getJSON 'http://my-card.in/announcements.json', (data)->
  $('#announcements').empty()
  for announcement in data[0...9]
    $('<li/>').append($('<a/>', href: announcement.url, text: announcement.title, class: 'select')).appendTo '#announcements'

mycard_version = null
ygopro_version = null

set_status = (text)->
  if !text
    text = "MyCard 版本: #{mycard_version}"
    text += " / YGOPro 版本: #{if (/^[a-fA-F0-9]{16}$/).test("ygopro_version") then '未知' else ygopro_version}" if ygopro_version
  $('#mycard_status').text text

mycard_client_connect = (wait=5)->
  connected = false

  mycard_client = new WebSocket 'ws://127.0.0.1:9998/'
  mycard_client.onopen = (evt)->
    connected = true
  mycard_client.onclose = (evt)->
    console.log '连接关闭'
    if !connected #从没连上去过
      if wait > 1
        mycard_client_connect(wait-1)
      else
        bootbox.alert("启动本地客户端失败")
    else
      $('#mycard_status').text '本地客户端连接中断, 正在重新连接...'
      mycard_client_start()

  mycard_client.onmessage = (evt)->
    msg = JSON.parse evt.data
    console.log msg
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

mycard_client_start = ->
  $('<iframe/>', src: 'mycard:///', hidden: true).appendTo('body')
  mycard_client_connect()

set_status 'Loading...'
mycard_client_start()