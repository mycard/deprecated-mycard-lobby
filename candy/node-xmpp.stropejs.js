Strophe = {
    NS: {
        HTTPBIND: "http://jabber.org/protocol/httpbind",
        BOSH: "urn:xmpp:xbosh",
        CLIENT: "jabber:client",
        AUTH: "jabber:iq:auth",
        ROSTER: "jabber:iq:roster",
        PROFILE: "jabber:iq:profile",
        DISCO_INFO: "http://jabber.org/protocol/disco#info",
        DISCO_ITEMS: "http://jabber.org/protocol/disco#items",
        MUC: "http://jabber.org/protocol/muc",
        SASL: "urn:ietf:params:xml:ns:xmpp-sasl",
        STREAM: "http://etherx.jabber.org/streams",
        BIND: "urn:ietf:params:xml:ns:xmpp-bind",
        SESSION: "urn:ietf:params:xml:ns:xmpp-session",
        VERSION: "jabber:iq:version",
        STANZAS: "urn:ietf:params:xml:ns:xmpp-stanzas",
        XHTML_IM: "http://jabber.org/protocol/xhtml-im",
        XHTML: "http://www.w3.org/1999/xhtml"
    }








}


/**
 * Echo Bot - the XMPP Hello World
 **/
var xmpp = require('node-xmpp');
var argv = process.argv;

if (argv.length != 4) {
    console.error('Usage: node echo_bot.js <my-jid> <my-password>');
    process.exit(1);
}

var cl = new xmpp.Client({ jid: argv[2],
    password: argv[3] });
cl.on('online',
    function () {
        cl.send(new xmpp.Element('presence', { }).
            c('show').t('chat').up().
            c('status').t('Happily echoing your <message/> stanzas')
        );
    });
cl.on('stanza',
    function (stanza) {
        if (stanza.is('message') &&
            // Important: never reply to errors!
            stanza.attrs.type !== 'error') {

            // Swap addresses...
            stanza.attrs.to = stanza.attrs.from;
            delete stanza.attrs.from;
            // and send back.
            cl.send(stanza);
        }
    });
cl.on('error',
    function (e) {
        console.error(e);
    });