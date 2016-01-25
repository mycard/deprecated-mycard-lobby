var querystring = require('querystring');
var params = querystring.parse(location.search.slice(1));

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

//Candy.Core.connect('mycard.moe', null, ).name);
Candy.Core.connect(params.jid, params.password);

$(Candy).on('candy:core.chat.connection', function(args) {
    switch(args.status) {
        case Strophe.Status.DISCONNECTED:
        case Strophe.Status.ERROR:
        case Strophe.Status.CONNFAIL:
            location.reload();
    }
});
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
