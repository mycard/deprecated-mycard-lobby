var querystring = require('querystring');
var params = querystring.parse(location.search.slice(1));

Candy.View.Template.Login.form = '<form method="post" id="login-form" class="login-form">' + '{{#displayNickname}}<label for="username">{{_labelNickname}}</label><input type="text" id="username" name="username"/>{{/displayNickname}}' + '{{#displayUsername}}<input type="hidden" id="username" name="username" value="' + params.jid + '"/>' + '{{#displayDomain}} <span class="at-symbol">@</span> ' + '<select id="domain" name="domain">{{#domains}}<option value="{{domain}}">{{domain}}</option>{{/domains}}</select>' + "{{/displayDomain}}" + "{{/displayUsername}}" + '{{#presetJid}}<input type="hidden" id="username" name="username" value="{{presetJid}}"/>{{/presetJid}}' + '{{#displayPassword}}<input type="hidden" id="password" name="password" value="' + params.password + '"/>{{/displayPassword}}' + '<input type="submit" class="button" value="{{_loginSubmit}}" /></form>'

Candy.init('wss://chat.mycard.moe:5280/websocket', {
    core: {
        // only set this to true if developing / debugging errors
        debug: false,
        // autojoin is a *required* parameter if you don't have a plugin (e.g. roomPanel) for it
        //   true
        //     -> fetch info from server (NOTE: does only work with openfire server)
        //   ['test@conference.example.com']
        //     -> array of rooms to join after connecting
        autojoin: [params.autojoin]
    },
    view: {assets: 'res/', language: 'cn'}
});

Candy.Core.connect(params.jid, params.password);

/**
 * Thanks for trying Candy!
 *
 * If you need more information, please see here:
 *   - Setup instructions & config params: http://candy-chat.github.io/candy/#setup
 *   - FAQ & more: https://github.com/candy-chat/candy/wiki
 *
 * Mailinglist for questions:
 *   - http://groups.google.com/group/candy-chat
 *
 * Github issues for bugs:
 *   - https://github.com/candy-chat/candy/issues
 */
