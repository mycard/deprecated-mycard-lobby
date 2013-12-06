(function (self, $) {
    Candy.View.Pane.Roster.update = function (roomJid, user, action, currentUser) {

        var roomId = self.Chat.rooms[roomJid].id,
            userId = Candy.Util.jidToId(user.getJid()),
            usercountDiff = -1,
            userElem = $('#user-' + roomId + '-' + userId);

        var evtData = {'roomJid': roomJid, type: null, 'user': user};

        /** Event: candy:view.roster.before-update
         * Before updating the roster of a room
         *
         * Parameters:
         *   (String) roomJid - Room JID
         *   (Candy.Core.ChatUser) user - User
         *   (String) action - [join, leave, kick, ban]
         *   (jQuery.Element) element - User element
         */
        $(self).triggerHandler('candy:view.roster.before-update', {
            'roomJid': roomJid,
            'user': user,
            'action': action,
            'element': userElem
        });

        // a user joined the room
        if (action === 'join') {
            usercountDiff = 1;
            var html = Mustache.to_html(Candy.View.Template.Roster.user, {
                roomId: roomId,
                userId: userId,
                userJid: user.getJid(),
                nick: user.getNick(),
                displayNick: Candy.Util.crop(user.getNick(), Candy.View.getOptions().crop.roster.nickname),
                role: user.getRole(),
                affiliation: user.getAffiliation(),
                me: currentUser !== undefined && user.getNick() === currentUser.getNick(),
                tooltipRole: $.i18n._('tooltipRole'),
                tooltipIgnored: $.i18n._('tooltipIgnored')
            });

            if (userElem.length < 1) {
                var userInserted = false,
                    rosterPane = self.Room.getPane(roomJid, '.roster-pane');

                // first user in roster
                if (!userInserted) {
                    rosterPane.append(html);
                }

                self.Roster.joinAnimation('user-' + roomId + '-' + userId);
                // only show other users joining & don't show if there's no message in the room.
                if (currentUser !== undefined && user.getNick() !== currentUser.getNick() && self.Room.getUser(roomJid)) {
                    // always show join message in private room, even if status messages have been disabled
                    if (self.Chat.rooms[roomJid].type === 'chat') {
                        self.Chat.onInfoMessage(roomJid, $.i18n._('userJoinedRoom', [user.getNick()]));
                    } else {
                        self.Chat.infoMessage(roomJid, $.i18n._('userJoinedRoom', [user.getNick()]));
                    }
                }
                // user is in room but maybe the affiliation/role has changed
            } else {
                usercountDiff = 0;
                userElem.replaceWith(html);
                $('#user-' + roomId + '-' + userId).css({opacity: 1}).show();
                // it's me, update the toolbar
                if (currentUser !== undefined && user.getNick() === currentUser.getNick() && self.Room.getUser(roomJid)) {
                    self.Chat.Toolbar.update(roomJid);
                }
            }

            // Presence of client
            if (currentUser !== undefined && currentUser.getNick() === user.getNick()) {
                self.Room.setUser(roomJid, user);
                // add click handler for private chat
            } else {
                $('#user-' + roomId + '-' + userId).click(self.Roster.userClick);
            }

            $('#user-' + roomId + '-' + userId + ' .context').click(function (e) {
                self.Chat.Context.show(e.currentTarget, roomJid, user);
                e.stopPropagation();
            });

            // check if current user is ignoring the user who has joined.
            if (currentUser !== undefined && currentUser.isInPrivacyList('ignore', user.getJid())) {
                Candy.View.Pane.Room.addIgnoreIcon(roomJid, user.getJid());
            }

            // a user left the room
        } else if (action === 'leave') {
            self.Roster.leaveAnimation('user-' + roomId + '-' + userId);
            // always show leave message in private room, even if status messages have been disabled
            if (self.Chat.rooms[roomJid].type === 'chat') {
                self.Chat.onInfoMessage(roomJid, $.i18n._('userLeftRoom', [user.getNick()]));
            } else {
                self.Chat.infoMessage(roomJid, $.i18n._('userLeftRoom', [user.getNick()]));
            }
            // user has been kicked
        } else if (action === 'kick') {
            self.Roster.leaveAnimation('user-' + roomId + '-' + userId);
            self.Chat.onInfoMessage(roomJid, $.i18n._('userHasBeenKickedFromRoom', [user.getNick()]));
            // user has been banned
        } else if (action === 'ban') {
            self.Roster.leaveAnimation('user-' + roomId + '-' + userId);
            self.Chat.onInfoMessage(roomJid, $.i18n._('userHasBeenBannedFromRoom', [user.getNick()]));
        }

        // Update user count
        Candy.View.Pane.Chat.rooms[roomJid].usercount += usercountDiff;

        if (roomJid === Candy.View.getCurrent().roomJid) {
            Candy.View.Pane.Chat.Toolbar.updateUsercount(Candy.View.Pane.Chat.rooms[roomJid].usercount);
        }

        var evtData = {
            'roomJid': roomJid,
            'user': user,
            'action': action,
            'element': $('#user-' + roomId + '-' + userId)
        };

        // deprecated
        Candy.View.Event.Roster.onUpdate(evtData);

        /** Event: candy:view.roster.after-update
         * After updating a room's roster
         *
         * Parameters:
         *   (String) roomJid - Room JID
         *   (Candy.Core.ChatUser) user - User
         *   (String) action - [join, leave, kick, ban]
         *   (jQuery.Element) element - User element
         */
        $(self).triggerHandler('candy:view.roster.after-update', evtData);
    }

    /** Function: joinAnimation
     * Animates specified elementId on join
     *
     * Parameters:
     *   (String) elementId - Specific element to do the animation on
     */
    self.Roster.joinAnimation = function (elementId) {
        $('#' + elementId).show().css({opacity: 1})
    }
})(Candy.View.Pane, jQuery);

(function (self, $) {
    self.Message = function (event, args) {
        if (args.message.type === 'subject') {
            if (!Candy.View.Pane.Chat.rooms[args.roomJid]) {
                Candy.View.Pane.Room.init(args.roomJid, args.message.name);
                Candy.View.Pane.Room.show(args.roomJid);
            }
            Candy.View.Pane.Room.setSubject(args.roomJid, args.message.body);
        } else if (args.message.type === 'info') {
            Candy.View.Pane.Chat.infoMessage(args.roomJid, args.message.body);
        } else {
            // Initialize room if it's a message for a new private user chat
            if (args.message.type === 'chat' && !Candy.View.Pane.Chat.rooms[args.roomJid]) {
                args.roomJid = Strophe.getBareJidFromJid(args.roomJid);
                Candy.View.Pane.PrivateRoom.open(args.roomJid, args.message.name, false, args.message.isNoConferenceRoomJid);
            }
            Candy.View.Pane.Message.show(args.roomJid, args.message.name, args.message.body, args.timestamp);
        }
    };
})(Candy.View.Observer, jQuery);


(function (self, Strophe, $) {
    self.Strophe.Connect = function (status) {
        Candy.Core.setStropheStatus(status);
        /** Event: candy:core.chat.connection
         * Connection status updates
         *
         * Parameters:
         *   (Strophe.Status) status - Strophe status
         */
        $(self).triggerHandler('candy:core.chat.connection', { status: status });
        switch (status) {
            case Strophe.Status.CONNECTED:
                Candy.Core.log('[Connection] Connected');
                Candy.Core.Action.Jabber.GetJidIfAnonymous();
            // fall through because the same things need to be done :)
            case Strophe.Status.ATTACHED:
                Candy.Core.log('[Connection] Attached');
                Candy.Core.Action.Jabber.Presence();
                Candy.Core.Action.Jabber.Autojoin();
                Candy.Core.Action.Jabber.GetIgnoreList();
                break;

            case Strophe.Status.DISCONNECTED:
                Candy.Core.log('[Connection] Disconnected');
                break;

            case Strophe.Status.AUTHFAIL:
                Candy.Core.log('[Connection] Authentication failed');
                break;

            case Strophe.Status.CONNECTING:
                Candy.Core.log('[Connection] Connecting');
                break;

            case Strophe.Status.DISCONNECTING:
                Candy.Core.log('[Connection] Disconnecting');
                break;

            case Strophe.Status.AUTHENTICATING:
                Candy.Core.log('[Connection] Authenticating');
                break;

            case Strophe.Status.ERROR:
            case Strophe.Status.CONNFAIL:
                Candy.Core.log('[Connection] Failed (' + status + ')');
                break;

            default:
                Candy.Core.log('[Connection] What?!');
                break;
        }
    }
})(Candy.Core.Event || {}, Strophe, jQuery);

//fix中文验证问题
Strophe.Connection.prototype.authenticate = function ()
{
    if (Strophe.getNodeFromJid(this.jid) === null &&
        this._authentication.sasl_anonymous) {
        this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null);
        this._sasl_success_handler = this._addSysHandler(
            this._sasl_success_cb.bind(this), null,
            "success", null, null);
        this._sasl_failure_handler = this._addSysHandler(
            this._sasl_failure_cb.bind(this), null,
            "failure", null, null);

        this.send($build("auth", {
            xmlns: Strophe.NS.SASL,
            mechanism: "ANONYMOUS"
        }).tree());
    } else if (Strophe.getNodeFromJid(this.jid) === null) {
        // we don't have a node, which is required for non-anonymous
        // client connections
        this._changeConnectStatus(Strophe.Status.CONNFAIL,
            'x-strophe-bad-non-anon-jid');
        this.disconnect();
    /*} else if (this._authentication.sasl_scram_sha1) {
        var cnonce = MD5.hexdigest(Math.random() * 1234567890);

        var auth_str = "n=" + Strophe.getNodeFromJid(this.jid);
        auth_str += ",r=";
        auth_str += cnonce;

        this._sasl_data["cnonce"] = cnonce;
        this._sasl_data["client-first-message-bare"] = auth_str;

        auth_str = "n,," + auth_str;

        this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null);
        this._sasl_challenge_handler = this._addSysHandler(
            this._sasl_scram_challenge_cb.bind(this), null,
            "challenge", null, null);
        this._sasl_failure_handler = this._addSysHandler(
            this._sasl_failure_cb.bind(this), null,
            "failure", null, null);

        this.send($build("auth", {
            xmlns: Strophe.NS.SASL,
            mechanism: "SCRAM-SHA-1"
        }).t(Base64.encode(auth_str)).tree());*/
    } else if (this._authentication.sasl_digest_md5) {
        this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null);
        this._sasl_challenge_handler = this._addSysHandler(
            this._sasl_digest_challenge1_cb.bind(this), null,
            "challenge", null, null);
        this._sasl_failure_handler = this._addSysHandler(
            this._sasl_failure_cb.bind(this), null,
            "failure", null, null);

        this.send($build("auth", {
            xmlns: Strophe.NS.SASL,
            mechanism: "DIGEST-MD5"
        }).tree());
    } else if (this._authentication.sasl_plain) {
        // Build the plain auth string (barejid null
        // username null password) and base 64 encoded.
        auth_str = unescape(encodeURIComponent(Strophe.getBareJidFromJid(this.jid)));
        auth_str = auth_str + "\u0000";
        auth_str = auth_str + unescape(encodeURIComponent(Strophe.getNodeFromJid(this.jid)));
        auth_str = auth_str + "\u0000";
        auth_str = auth_str + this.pass;

        this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null);
        this._sasl_success_handler = this._addSysHandler(
            this._sasl_success_cb.bind(this), null,
            "success", null, null);
        this._sasl_failure_handler = this._addSysHandler(
            this._sasl_failure_cb.bind(this), null,
            "failure", null, null);

        hashed_auth_str = Base64.encode(auth_str);
        this.send($build("auth", {
            xmlns: Strophe.NS.SASL,
            mechanism: "PLAIN"
        }).t(hashed_auth_str).tree());
    } else {
        this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null);
        this._addSysHandler(this._auth1_cb.bind(this), null, null,
            null, "_auth_1");

        this.send($iq({
            type: "get",
            to: this.domain,
            id: "_auth_1"
        }).c("query", {
                xmlns: Strophe.NS.AUTH
            }).c("username", {}).t(Strophe.getNodeFromJid(this.jid)).tree());
    }
}