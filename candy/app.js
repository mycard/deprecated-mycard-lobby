var querystring = require('querystring');
var params = querystring.parse(location.search.slice(1));

Candy.View.Template.Login.form = '<form method="post" id="login-form" class="login-form">' + '<input type="hidden" id="nickname" name="nickname" value="' + params.nickname + '"/>' + '{{#displayUsername}}<input type="hidden" id="username" name="username" value="' + params.jid + '"/>' + '{{#displayDomain}} <span class="at-symbol">@</span> ' + '<select id="domain" name="domain">{{#domains}}<option value="{{domain}}">{{domain}}</option>{{/domains}}</select>' + "{{/displayDomain}}" + "{{/displayUsername}}" + '{{#presetJid}}<input type="hidden" id="username" name="username" value="{{presetJid}}"/>{{/presetJid}}' + '{{#displayPassword}}<input type="hidden" id="password" name="password" value="' + params.password + '"/>{{/displayPassword}}' + '<input type="submit" class="button" value="{{_loginSubmit}}" /></form>'

Candy.Util.setCookie('candy-nostatusmessages', '1', 365);

Candy.init('wss://chat.mycard.moe:5280/websocket', {
    core: {
        // only set this to true if developing / debugging errors
        debug: false,
        // autojoin is a *required* parameter if you don't have a plugin (e.g. roomPanel) for it
        //   true
        //     -> fetch info from server (NOTE: does only work with openfire server)
        //   ['test@conference.example.com']
        //     -> array of rooms to join after connecting
        autojoin: [params.autojoin],
        resource: 'mycard-' + Math.random().toString().split('.')[1]
    },
    view: {assets: 'res/', language: 'cn'}
});

Candy.Core.connect(params.jid, params.password, params.nickname);

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

// candy fix
Base64.encode = function (input) {
    return new Buffer(input).toString('base64');
};
Base64.decode = function (input) {
    return new Buffer(input, 'base64').toString();
};

/*Candy.View.Pane = function(self, $){
    self.Chat.Modal.showLoginForm = function (message, presetJid) {
        var domains = Candy.Core.getOptions().domains;
        var hideDomainList = Candy.Core.getOptions().hideDomainList;
        domains = domains ? domains.map(function (d) {
            return {
                domain: d
            };
        }) : null;
        var customClass = domains && !hideDomainList ? "login-with-domains" : null;
        self.Chat.Modal.show((message ? message : "") + Mustache.to_html(Candy.View.Template.Login.form, {
                _labelNickname: $.i18n._("labelNickname"),
                _labelUsername: $.i18n._("labelUsername"),
                domains: domains,
                _labelPassword: $.i18n._("labelPassword"),
                _loginSubmit: $.i18n._("loginSubmit"),
                displayPassword: !Candy.Core.isAnonymousConnection(),
                displayUsername: !presetJid,
                displayDomain: domains ? true : false,
                displayNickname: Candy.Core.isAnonymousConnection(),
                presetJid: presetJid ? presetJid : false
            }), null, null, customClass);
        if (hideDomainList) {
            $("#domain").hide();
            $(".at-symbol").hide();
        }
        $("#login-form").children(":input:first").focus();
        // register submit handler
        $("#login-form").submit(function () {
            var username = $("#username").val(), password = $("#password").val(), domain = $("#domain"), nickname = $("#nickname").val();
            domain = domain.length ? domain.val().split(" ")[0] : null;
            if (!Candy.Core.isAnonymousConnection()) {
                var jid;
                if (domain) {
                    // domain is stipulated
                    // Ensure there is no domain part in username
                    username = username.split("@")[0];
                    jid = username + "@" + domain;
                } else {
                    // domain not stipulated
                    // guess the input and create a jid out of it
                    jid = Candy.Core.getUser() && username.indexOf("@") < 0 ? username + "@" + Strophe.getDomainFromJid(Candy.Core.getUser().getJid()) : username;
                }
                if (jid.indexOf("@") < 0 && !Candy.Core.getUser()) {
                    Candy.View.Pane.Chat.Modal.showLoginForm($.i18n._("loginInvalid"));
                } else {
                    //Candy.View.Pane.Chat.Modal.hide();
                    Candy.Core.connect(jid, password, nickname);
                }
            } else {
                // anonymous login
                Candy.Core.connect(presetJid, null, username);
            }
            return false;
        });
    };
    return self;
}(Candy.View.Pane, jQuery);*/