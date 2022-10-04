import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/TwitchDataTypes";
import { EventDispatcher } from "@/utils/EventDispatcher";
import ChatCypherPlugin from "@/utils/ChatCypherPlugin";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import UserSession from "@/utils/UserSession";
import Utils from "@/utils/Utils";
import * as tmi from "tmi.js";
import MessengerClientEvent from "./MessengerClientEvent";
import rewardImg from '@/assets/icons/reward_highlight.svg';

/**
* Created : 25/09/2022 
*/
export default class TwitchMessengerClient extends EventDispatcher {

	private static _instance:TwitchMessengerClient;
	private _client!:tmi.Client;
	private _credentials:{token:string, username:string}|null = null;
	private _reconnecting:boolean = false;
	private _connectedAnonymously:boolean = false;
	private _connectTimeout:number = -1;
	private _connectedChannels:string[] = [];
	private _blockedUsers:{[key:string]:boolean} = {};
	private queuedMessages:{message:string, tags:unknown, self:boolean, channel:string}[] = [];
	
	constructor() {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():TwitchMessengerClient {
		if(!TwitchMessengerClient._instance) {
			TwitchMessengerClient._instance = new TwitchMessengerClient();
			TwitchMessengerClient._instance.initialize();
		}
		return TwitchMessengerClient._instance;
	}

	/**
	 * Set authentication token
	 */
	public set credentials(value:{token:string, username:string}) {
		this._credentials = value;
		this.connectToChannel(value.username);
		this.loadBlockedUsers();
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Connect to a channel
	 * @param channel 
	 * @param anonymous 
	 */
	public connectToChannel(channel:string):void {
		//Already connected to that channel ?
		if(this._connectedChannels.findIndex(v=>v === channel) > -1) return;
		
		this._connectedChannels.push(channel);
		
		//Debounce connection calls if calling it for multiple channels at once
		clearTimeout(this._connectTimeout);
		this._connectTimeout = setTimeout(()=>{
			if(!this._client) {
				//Not yet connected to IRC, create client and connect to specified
				//channels with specified credentials
				if(!this._credentials) {
					//not token given, anonymous authentication
					this._client = new tmi.Client({
						options: { debug: false, skipUpdatingEmotesets:true, },
						connection: { reconnect: true, maxReconnectInverval:2000 },
						channels:this._connectedChannels.concat(),
					});
					this._connectedAnonymously = true;
				}else{
					//Token exists, authenticate
					this._client = new tmi.Client({
						options: { debug: false, skipUpdatingEmotesets:true, },
						connection: { reconnect: true, maxReconnectInverval:2000 },
						channels:this._connectedChannels.concat(),
						identity: {
							username: this.credentials.username,
							password: "oauth:"+this._credentials?.token,
						},
					});
				}
				this.createHandlers();
			}else{
				//Already connected to IRC, add channel to the list
				//and reconnect IRC client
				const params = this._client.getOptions();
				params.channels = this._connectedChannels;
				this.reconnect();
			}
		}, 100);
	}

	/**
	 * Disconnect from a specific channel
	 * @param channel 
	 */
	public async disconnectFromChannel(channel:string):Promise<void> {
		const params = this._client.getOptions();
		const index = this._connectedChannels.findIndex(v=>v===channel);
		if(index > -1) {
			this._connectedChannels.splice(index, 1);
			params.channels = this._connectedChannels;
			await this.reconnect();
		}
	}

	/**
	 * Refresh IRC token
	 * Disconnects from all chans and connects back to it
	 * @param token 
	 */
	public async refreshToken(token:string):Promise<void> {
		const params = this._client.getOptions();
		if(!params.identity) {
			params.identity = {
				username: this.credentials.username,
				password: "oauth:"+this._credentials?.token,
			}
		}
		params.identity.password = token;
		await this.reconnect();
	}
	
	/**
	 * Disconnect from all channels and cut IRC connection
	 */
	public disconnect():void {
		if(this._client) {
			this._client.disconnect();
		}
	}
	
	/**
	 * Disconnect from all channels and cut IRC connection
	 */
	public async sendMessage(text:string):Promise<void> {
		//TMI.js doesn't send the message back to their sender if sending
		//it just after receiving a message (same frame).
		//If we didn't wait for a frame, the message would be sent properly
		//to viewers, but wouldn't appear on this chat.
		//To make sure this isn't a problem through the app we always wait
		//a frame before sending the message
		await Utils.promisedTimeout(0);

		//Workaround to a weird behavior of TMI.js.
		//If the message starts by a "\" it's properly sent on all
		//connected clients, but never sent back to the sender.
		//Removing all of them to avoid that...
		text = text.replace(/^\\+/gi, "");

		if(text.charAt(0) == "/") {
			const chunks = text.split(/\s/gi);
			let cmd = (chunks.shift() as string).toLowerCase();
			if(cmd.indexOf("/announce")) {
				let color = cmd.replace("/announce", "");
				if(color.length === 0) color = "primary";
				if(["blue","green","orange","purple","primary"].indexOf(color) === -1) {
					StoreProxy.main.showAlert("Invalid announcement color");
					return;
				}
				cmd = "/announce";
				chunks.unshift(color);
			}

			async function getUserFromLogin(login:string):Promise<TwitchDataTypes.UserInfo|null>{
				let res:TwitchDataTypes.UserInfo[];
				try {
					res = await TwitchUtils.loadUserInfo(undefined, [login])
				}catch(error) {
					StoreProxy.main.showAlert("User @"+login+" not found on Twitch.");
					return null;
				}
				return res[0];
			}

			let prom!:Promise<boolean>;

			switch(cmd) {
				case "/announce": prom = TwitchUtils.sendAnnouncement(chunks[1], chunks[0] as "blue"|"green"|"orange"|"purple"|"primary"); break;
				case "/ban":{
					const user = await getUserFromLogin(chunks[0]);
					if(user) prom = TwitchUtils.banUser(user.id, undefined, chunks.splice(1).join(" "));
					break;
				}
				case "/unban": {
					const user = await getUserFromLogin(chunks[0]);
					if(user) prom = TwitchUtils.unbanUser(user.id);
					break;
				}
				case "/block":{
					const user = await getUserFromLogin(chunks[0]);
					if(user) prom = TwitchUtils.blockUser(user.id);
					break;
				}
				case "/unblock": {
					const user = await getUserFromLogin(chunks[0]);
					if(user) prom = TwitchUtils.unblockUser(user.id);
					break;
				}
				case "/timeout":{
					const user = await getUserFromLogin(chunks[0]);
					if(user) prom = TwitchUtils.banUser(user.id, parseInt(chunks[1]), chunks[2]);
					break;
				}
				case "/untimeout": {
					const user = await getUserFromLogin(chunks[0]);
					if(user) prom = TwitchUtils.unbanUser(user.id);
					break;
				}
				case "/commercial": {
					let duration = parseInt(chunks[0]);
					StoreProxy.main.confirm("Start a commercial?", "The commercial break will last "+duration+"s. It's not guaranteed that a commercial actually starts.").then(async () => {
						try {
							const res = await TwitchUtils.startCommercial(duration);
							if(res.length > 0) {
								StoreProxy.stream.setCommercialEnd( Date.now() + res.length * 1000 );
							}
						}catch(error) {
							const e = (error as unknown) as {error:string, message:string, status:number}
							console.log(error);
							this.notice(TwitchatDataTypes.TwitchatNoticeType.COMMERCIAL_ERROR, e.message, UserSession.instance.twitchUser!.login);
						}
					}).catch(()=>{/*ignore*/});
				}
				case "/delete": prom = TwitchUtils.deleteMessages(chunks[0]); break;
				case "/clear": prom = TwitchUtils.deleteMessages(); break;
				case "/color": prom = TwitchUtils.setColor(chunks[0]); break;
				case "/emoteonly": prom = TwitchUtils.setRoomSettings({emotesOnly:true}); break;
				case "/emoteonlyoff": prom = TwitchUtils.setRoomSettings({emotesOnly:false}); break;
				case "/followers": prom = TwitchUtils.setRoomSettings({followOnly:parseInt(chunks[0])}); break;
				case "/followersoff": prom = TwitchUtils.setRoomSettings({followOnly:0}); break;
				case "/slow": prom = TwitchUtils.setRoomSettings({slowMode:parseInt(chunks[0])}); break;
				case "/slowoff": prom = TwitchUtils.setRoomSettings({slowMode:0}); break;
				case "/subscribers": prom = TwitchUtils.setRoomSettings({subOnly:true}); break;
				case "/subscribersoff": prom = TwitchUtils.setRoomSettings({subOnly:false}); break;
				case "/mod": prom = TwitchUtils.addRemoveModerator(false, undefined, chunks[0]); break;
				case "/unmod": prom = TwitchUtils.addRemoveModerator(true, undefined, chunks[0]); break;
				case "/raid": prom = TwitchUtils.raidChannel(chunks[0]); break;
				case "/unraid": prom = TwitchUtils.raidCancel(); break;
				case "/vip": prom = TwitchUtils.addRemoveVIP(false, undefined, chunks[0]); break;
				case "/unvip": prom = TwitchUtils.addRemoveVIP(true, undefined, chunks[0]); break;
				case "/whiser":
				case "/w": {
					const login = chunks[0];
					prom = TwitchUtils.whisper(chunks.splice(1).join(" "), login);
					break;
				}

				//TODO
				case "/uniquechat": return;
				case "/uniquechatoff": return;
				case "/marker": return;
				case "/mods": return;
				case "/vips": return;
			}
		}

		this._client.say(UserSession.instance.twitchUser!.login, text);
	}

	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		
	}

	/**
	 * Refresh IRC connection
	 * Called after updating the token or the channels list
	 */
	private async reconnect():Promise<void> {
		this._reconnecting = true;
		await this._client.disconnect();
		await this._client.connect();
	}

	/**
	 * Create events handlers
	 */
	private createHandlers():void {
		this._client.on('message', this.message);
		this._client.on("join", this.onJoin);
		this._client.on("part", this.onLeave);
		this._client.on('cheer', this.onCheer);
		this._client.on('resub', this.resub);
		this._client.on('subscription', this.subscription);
		this._client.on('subgift', this.subgift);
		this._client.on('anonsubgift', this.anonsubgift);
		this._client.on('giftpaidupgrade', this.giftpaidupgrade);
		this._client.on('anongiftpaidupgrade', this.anongiftpaidupgrade);
		this._client.on("ban", this.ban);
		this._client.on("timeout", this.timeout);
		this._client.on("raided", this.raided);
		this._client.on("disconnected", this.disconnected);
		this._client.on("clearchat", this.clearchat);
		this._client.on('raw_message', this.raw_message);
	}

	/**
	 * Loads list of blocked users
	 */
	private async loadBlockedUsers():Promise<void> {
		//Get list of all blocked users and build a hashmap out of it
		try {
			const blockedUsers = await TwitchUtils.getBlockedUsers();
			this._blockedUsers = {};
			for (let i = 0; i < blockedUsers.length; i++) {
				this._blockedUsers[ blockedUsers[i].user_id ] = true;
			}
		}catch(error) {/*ignore*/}
	}

	/**
	 * Gets a user object from IRC tags
	 * @param tags 
	 * @returns 
	 */
	private getUserFromTags(tags:tmi.ChatUserstate|tmi.SubUserstate|tmi.SubGiftUpgradeUserstate|tmi.SubGiftUserstate|tmi.AnonSubGiftUserstate|tmi.AnonSubGiftUpgradeUserstate):TwitchatDataTypes.TwitchatUser {
		const login = tags.username ?? tags["display-name"];
		
		const user = StoreProxy.users.getUserFrom("twitch", tags.id, login, tags["display-name"]);

		const isMod = tags.badges?.moderator != undefined || tags.mod === true;
		const isVip = tags.badges?.vip != undefined;
		const isSub = tags.badges?.subscriber != undefined || tags.subscriber === true;
		const isSubGifter = tags.badges && tags.badges["sub-gifter"] != undefined;
		const isBroadcaster = tags.badges?.broadcaster != undefined;
		const isPartner = tags.badges?.partner != undefined;

		user.is_partner = false;
		user.is_affiliate = false;
		if(isMod) user.is_moderator = true;
		if(isVip) user.is_vip = true;
		if(isSub) user.is_subscriber = true;
		if(isSubGifter) user.is_gifter = true;
		if(isBroadcaster) user.is_broadcaster = true;
		if(isPartner) {
			user.is_partner = true;
			user.is_affiliate = true;
		}
		
		user.online = true;

		if(tags.badges && tags["room-id"] && !user.badges) {
			let parsedBadges = TwitchUtils.getBadgesImagesFromRawBadges(tags["room-id"]!, tags.badges);
			const badges:TwitchatDataTypes.TwitchatUserBadge[] = [];
			for (let i = 0; i < parsedBadges.length; i++) {
				const b = parsedBadges[i];
				if(!tags["badge-info"]) tags["badge-info"] = {};
				badges.push({
					icon:{
						sd: b.image_url_1x,
						hd: b.image_url_4x,
					},
					id: b.id,
					title: tags["badge-info"][b.id] ?? b.title,
				});
			}
			user.badges = badges;
		}
		return user;
	}

	/**
	 * Gets a user object from its login
	 * 
	 * @param login 
	 * @returns 
	 */
	private getUserFromLogin(login:string):TwitchatDataTypes.TwitchatUser {
		//Search if a user with this name and source exists on store
		//If no user exists a temporary user object will be returned and
		//populated asynchronously via an API call
		return StoreProxy.users.getUserFrom("twitch", undefined, login);
	}
	
	/**
	 * Gets a sub object from data
	 * 
	 * @param channel 
	 * @param tags 
	 * @param methods 
	 * @param message 
	 * @returns 
	 */
	private getCommonSubObject(channel:string, tags:tmi.ChatUserstate|tmi.SubUserstate|tmi.SubGiftUpgradeUserstate|tmi.SubGiftUserstate|tmi.AnonSubGiftUserstate|tmi.AnonSubGiftUpgradeUserstate, methods?:tmi.SubMethods, message?:string):TwitchatDataTypes.MessageSubscriptionData {
		let res:TwitchatDataTypes.MessageSubscriptionData = {
			platform:"twitch",
			type:"subscription",
			id:tags.id ?? Utils.getUUID(),
			channel_id:channel.replace("#", ""),
			date:parseInt(tags["tmi-sent-ts"] as string ?? Date.now().toString()),
			user:this.getUserFromTags(tags),
			tier: 1,
			is_gift: false,
			is_giftUpgrade: false,
			is_resub: false,
			months:typeof tags["msg-param-multimonth-duration"] == "string"? parseInt(tags["msg-param-multimonth-duration"]) : -1,
			streakMonths:typeof tags["msg-param-streak-months"] == "string"? parseInt(tags["msg-param-streak-months"]) : -1,
			totalSubDuration:typeof tags["msg-param-cumulative-months"] == "string"? parseInt(tags["msg-param-cumulative-months"]) : -1,
		}
		if(methods) res.tier =  methods.prime? "prime" : (parseInt((methods.plan as string) ?? 1000)/1000) as (1|2|3);
		if(message) {
			res.message = message;
			res.message_html = TwitchUtils.parseEmotes(message, tags["emotes-raw"]);
		}
		return res;
	}

	private async message(channel:string, tags:tmi.ChatUserstate, message:string, self:boolean):Promise<void> {
		if(!tags.id) {
			//When sending a message from the current client, IRC never send it back to us.
			//TMI tries to make this transparent by firing the "message" event but
			//it won't populate the data with the actual ID of the message.
			//To workaround this issue, we just store the message on a queue, and
			//wait for a NOTICE event that gives us the message ID in which case
			//we pop the message from the queue
			this.queuedMessages.push({message, tags, self, channel});
			return;
		}
		
		
		//This line avoids an edge case issue.
		//If the current TMI client sends messages super fast (some ms between each message),
		//the tags property is not updated for the later messages that will receive
		//the exact same tags instance (not only the same values).
		//This makes multiple messages sharing the same ID which can cause
		//issues with VueJS keyed items (ex: on v-for loops) that would share
		//the same value which is not allowed
		tags = JSON.parse(JSON.stringify(tags));

		if(tags["message-type"] != "chat" && tags["message-type"] != "action") return;

		const user = this.getUserFromTags(tags);
		
		if(!user.color) user.color = tags.color;
		//User has no color give them a random one
		if(!user.color) {
			user.color = Utils.pickRand(["#ff0000","#0000ff","#008000","#b22222","#ff7f50","#9acd32","#ff4500","#2e8b57","#daa520","#d2691e","#5f9ea0","#1e90ff","#ff69b4","#8a2be2","#00ff7f"]);
		}

		const data:TwitchatDataTypes.MessageChatData = {
			id:tags.id!,
			type:"message",
			platform:"twitch",
			channel_id:channel.replace("#", ""),
			date:Date.now(),

			user,
			message,
			answers:[],
			message_html:"",
			todayFirst:user.greeted===false,
		};

		data.message_html = TwitchUtils.parseEmotes(message, tags["emotes-raw"]);
				
		// If message is an answer, set original message's ref to the answer
		// Called when using the "answer feature" on twitch chat
		if(tags["reply-parent-msg-id"]) {
			const messages = StoreProxy.chat.messages;
			//Search for original message the user answered to
			for (let i = 0; i < messages.length; i++) {
				let m = messages[i];
				if(m.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) continue;
				if(m.id === tags["reply-parent-msg-id"]) {
					if(m.answersTo) m = m.answersTo;
					if(!m.answers) m.answers = [];
					m.answers.push( data );
					data.answersTo = m;
					break;
				}
			}
		}else{
			//If there's a mention, search for last messages within
			//a max timeframe to find if the message may be a reply to
			//a message that was sent by the mentionned user
			if(/@\w/gi.test(message)) {
				// console.log("Mention found");
				const ts = Date.now();
				const messages = StoreProxy.chat.messages;
				const timeframe = 5*60*1000;//Check if a massage answers another within this timeframe
				const matches = message.match(/@\w+/gi) as RegExpMatchArray;
				for (let i = 0; i < matches.length; i++) {
					const match = matches[i].replace("@", "").toLowerCase();
					// console.log("Search for message from ", match);
					const candidates = messages.filter(m => {
						if(m.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) return false;
						return m.user.login == match
					}) as TwitchatDataTypes.MessageChatData[];
					//Search for oldest matching candidate
					for (let j = 0; j < candidates.length; j++) {
						const c = candidates[j];
						// console.log("Found candidate", c);
						if(ts - c.date < timeframe) {
							// console.log("Timeframe is OK !");
							if(c.answers) {
								//If it's the root message of a conversation
								c.answers.push( data );
								data.answersTo = c;
							}else if(c.answersTo && c.answersTo.answers) {
								//If the messages answers to a message itself answering to another message
								c.answersTo.answers.push( data );
								data.answersTo = c.answersTo;
							}else{
								//If message answers to a message not from a conversation
								data.answersTo = c;
								if(!c.answers) c.answers = [];
								c.answers.push( data );
							}
							break;
						}
					}
				}
			}
		}
				
		//Custom secret feature hehehe ( ͡~ ͜ʖ ͡°)
		if(ChatCypherPlugin.instance.isCyperCandidate(message)) {
			const original = message;
			message = await ChatCypherPlugin.instance.decrypt(original);
			data.cyphered = message != original;
		}

		//Check if the message contains a mention
		if(message && StoreProxy.params.appearance.highlightMentions.value === true) {
			data.hasMention = UserSession.instance.twitchAuthToken.login != null && 
							new RegExp("(^| |@)("+UserSession.instance.twitchAuthToken.login+")($|\\s)", "gim")
							.test(message);
			if(data.hasMention) {
				data.highlightWord = UserSession.instance.twitchAuthToken.login;
			}
		}
		
		data.twitch_isSlashMe		= tags["message-type"] === "action";
		data.twitch_isReturning		= tags["returning-chatter"] === true;
		data.twitch_isFirstMessage	= tags['first-msg'] === true && tags["msg-id"] != "user-intro";
		data.twitch_isPresentation	= tags["msg-id"] == "user-intro";
		data.twitch_isHighlighted	= tags["msg-id"] === "highlighted-message";
		let pinAmount:number|undefined = tags["pinned-chat-paid-canonical-amount"];
		if(pinAmount) {
			data.elevatedInfo	= {amount:pinAmount, duration_s:{"5":30, "10":60, "25":90, "50":120, "100":150}[pinAmount] ?? 30};
		}

		//Send reward redeem message if the message comes from an "highlight my message" reward
		if(data.twitch_isHighlighted) {
			const reward:TwitchatDataTypes.MessageRewardRedeemData = {
				channel_id: data.channel_id,
				date: data.date,
				id:Utils.getUUID(),
				platform:"twitch",
				type:"reward",
				user: data.user,
				reward: {
					id:"highlighted-message",
					title:"Highlight my message",
					cost:-1,
					description:"",
					icon:{
						sd:rewardImg,
					}
				},
				message:data.message,
				message_html:data.message_html,
			}
			this.dispatchEvent(new MessengerClientEvent("REWARD", reward));
		}

		this.dispatchEvent(new MessengerClientEvent("MESSAGE", data));
	}

	private onJoin(channel:string, user:string):void {
		if(user == UserSession.instance.twitchUser?.login.toLowerCase() && !this._reconnecting) {
			this.notice(TwitchatDataTypes.TwitchatNoticeType.ONLINE, "Welcome to the chat room "+channel+"!", channel);
			this._reconnecting = false;
		}
		this.dispatchEvent(new MessengerClientEvent("JOIN", {
			platform:"twitch",
			type:"join",
			id:Utils.getUUID(),
			channel_id:channel.replace("#", ""),
			date:Date.now(),
			users:[this.getUserFromLogin(user)],
		}));
	}

	private onLeave(channel:string, user:string):void {
		this.dispatchEvent(new MessengerClientEvent("LEAVE", {
			platform:"twitch",
			type:"leave",
			id:Utils.getUUID(),
			channel_id:channel.replace("#", ""),
			date:Date.now(),
			users:[this.getUserFromLogin(user)],
		}));
	}

	private async onCheer(channel:string, tags:tmi.ChatUserstate, message:string):Promise<void> {
		let message_html = TwitchUtils.parseEmotes(message, tags["emotes-raw"]);
		message_html = await TwitchUtils.parseCheermotes(message_html, UserSession.instance.twitchUser!.id);
		this.dispatchEvent(new MessengerClientEvent("CHEER", {
			platform:"twitch",
			type:"cheer",
			id:tags.id ?? Utils.getUUID(),
			channel_id:channel.replace("#", ""),
			date:parseInt(tags["tmi-sent-ts"] as string ?? Date.now().toString()),
			user:this.getUserFromTags(tags),
			bits:parseFloat(tags.bits as string) ?? -1,
			message,
			message_html,
		}));
	}

	private resub(channel: string, username: string, months: number, message: string, tags: tmi.SubUserstate, methods: tmi.SubMethods):void {
		const data = this.getCommonSubObject(channel, tags, methods, message);
		data.is_resub = true;
		data.months = months;
		this.dispatchEvent(new MessengerClientEvent("SUB", data));
	}

	private subscription(channel: string, username: string, methods: tmi.SubMethods, message: string, tags: tmi.SubUserstate):void {
		const data = this.getCommonSubObject(channel, tags, methods, message);
		this.dispatchEvent(new MessengerClientEvent("SUB", data));
	}

	private subgift(channel: string, username: string, streakMonths: number, recipient: string, methods: tmi.SubMethods, tags: tmi.SubGiftUserstate):void {
		const data = this.getCommonSubObject(channel, tags, methods);
		data.is_gift = true;
		data.gift_recipients = [this.getUserFromLogin(recipient)];
		this.dispatchEvent(new MessengerClientEvent("SUB", data));
	}
	
	private anonsubgift(channel: string, streakMonths: number, recipient: string, methods: tmi.SubMethods, tags: tmi.AnonSubGiftUserstate):void {
		const data = this.getCommonSubObject(channel, tags, methods);
		data.is_gift = true;
		data.streakMonths = streakMonths
		data.gift_recipients = [this.getUserFromLogin(recipient)];
		this.dispatchEvent(new MessengerClientEvent("SUB", data));
	}
	
	private giftpaidupgrade(channel: string, username: string, sender: string, tags: tmi.SubGiftUpgradeUserstate):void {
		const data = this.getCommonSubObject(channel, tags);
		data.is_giftUpgrade = true;
		data.gift_upgradeSender = this.getUserFromLogin(username);
		this.dispatchEvent(new MessengerClientEvent("SUB", data));
	}
	
	private anongiftpaidupgrade(channel: string, username: string, tags: tmi.AnonSubGiftUpgradeUserstate):void {
		const data = this.getCommonSubObject(channel, tags);
		data.is_giftUpgrade = true;
		this.dispatchEvent(new MessengerClientEvent("SUB", data));
	}

	private ban(channel: string, username: string, reason: string):void {
		this.dispatchEvent(new MessengerClientEvent("BAN", {
			platform:"twitch",
			type:"ban",
			id:Utils.getUUID(),
			channel_id:channel.replace("#", ""),
			date:Date.now(),
			user:this.getUserFromLogin(username),
			reason,
		}));
	}

	private timeout(channel: string, username: string, reason: string, duration: number):void {
		this.dispatchEvent(new MessengerClientEvent("TIMEOUT", {
			platform:"twitch",
			type:"timeout",
			id:Utils.getUUID(),
			channel_id:channel.replace("#", ""),
			date:Date.now(),
			user:this.getUserFromLogin(username),
			duration_s:duration,
			reason,
		}));
	}

	private raided(channel: string, username: string, viewers: number):void {
		this.dispatchEvent(new MessengerClientEvent("RAID", {
			platform:"twitch",
			type:"raid",
			id:Utils.getUUID(),
			channel_id:channel.replace("#", ""),
			date:Date.now(),
			user:this.getUserFromLogin(username),
			viewers
		}));
	}
	
	private disconnected(reason:string):void {
		const eventData:TwitchatDataTypes.MessageNoticeData = {
			channel_id: "twitchat",
			id:Utils.getUUID(),
			type:"notice",
			date:Date.now(),
			platform:"twitch",
			message:"You have been disconnected from the chat :(",
			noticeId:TwitchatDataTypes.TwitchatNoticeType.OFFLINE,
		};
		this.dispatchEvent(new MessengerClientEvent("NOTICE", eventData));
	}

	private clearchat(channel:string):void {
		this.dispatchEvent(new MessengerClientEvent("CLEAR_CHAT", {
			platform:"twitch",
			type:"clear_chat",
			id:Utils.getUUID(),
			channel_id:channel.replace("#", ""),
			date:Date.now(),
		}));
	}

	private async raw_message(messageCloned: { [property: string]: unknown }, data: { [property: string]: unknown }):Promise<void> {
		//TMI parses the "badges" and "badge-info" props right AFTER dispatching
		//the "raw_message" event.
		//Let's wait a frame so the props are parsed
		await Utils.promisedTimeout(0);
		switch(data.command) {
			case "USERNOTICE": {
				//Handle announcement messages
				if(((data.tags as tmi.ChatUserstate)["msg-id"] as unknown) === "announcement") {
					const params = data.params as string[];
					const tags = data.tags as tmi.ChatUserstate;
					tags.username = tags.login;

					this.message(params[0], tags, params[1], false);
				}
				break;
			}

			case "WHISPER": {
				//Not using the client.on("whisper") helper as it does not provides
				//the receiver. Here we get everything.
				const [toLogin, message] = (data as {params:string[]}).params;
				const tags = data.tags as tmi.ChatUserstate;
				const eventData:TwitchatDataTypes.MessageWhisperData = {
					id:Utils.getUUID(),
					type:"whisper",
					date:Date.now(),
		
					platform:"twitch",
					user: this.getUserFromTags(tags),
					to: this.getUserFromLogin(toLogin),
					message:message,
					message_html:TwitchUtils.parseEmotes(message, tags["emotes-raw"]),
				};
		
				this.dispatchEvent(new MessengerClientEvent("WHISPER", eventData));
				break;
			}

			case "USERSTATE": {
				TwitchUtils.loadEmoteSets((data as tmi.UserNoticeState).tags["emote-sets"].split(","));
				
				//If there are messages pending for their ID, give the oldest one the received ID
				if((data as tmi.UserNoticeState).tags.id && this.queuedMessages.length > 0) {
					const m = this.queuedMessages.shift();
					if(m) {
						(m.tags as tmi.ChatUserstate).id = (data as tmi.UserNoticeState).tags.id;
						(m.tags as tmi.ChatUserstate)["tmi-sent-ts"] = Date.now().toString();
						this.message(m.channel, m.tags as tmi.ChatUserstate, m.message, m.self);
					}
				}
				break;
			}

			case "ROOMSTATE": {
				const roomstate = (data as unknown) as TwitchDataTypes.RoomState;
				//TODO check if this still works
				if(roomstate.params[0].replace("#", "") == UserSession.instance.twitchUser?.login) {
					const sStream = StoreProxy.stream;
					const params = sStream.roomStatusParams.twitch;
					if(!params) return;
					if(roomstate.tags['emote-only'] != undefined) params.emotesOnly.value = roomstate.tags['emote-only'] != false;
					if(roomstate.tags['subs-only'] != undefined) params.subsOnly.value = roomstate.tags['subs-only'] != false;
					if(roomstate.tags['followers-only'] != undefined) params.followersOnly.value = parseInt(roomstate.tags['followers-only']) > -1;
					if(roomstate.tags.slow != undefined) params.slowMode.value = roomstate.tags.slow != false;
				}
				break;
			}

			//Using this instead of the "notice" event from TMI as it's not
			//fired for many notices whereas here we get them all
			case "NOTICE": {
				let [msgid, url, cmd, channel, message] = (data.raw as string).replace(/@msg-id=(.*) :(.*) (.*) (#.*) :(.*)/gi, "$1::$2::$3::$4::$5").split("::");
				
				if(!message) {
					if(msgid.indexOf("bad_delete_message_error") > -1) {
						message = "You cannot delete this message.";
					}
					if(msgid.indexOf("authentication failed") > -1) {
						message = "Authentication failed. Refreshing token and trying again...";
						this.dispatchEvent(new MessengerClientEvent("REFRESH_TOKEN"));
					}
				}
				if(message) {
					this.notice(msgid, message, channel);
				}
				break;
			}
			default: break;
		}
	}

	private notice(id:TwitchatDataTypes.TwitchatNoticeStringType, channel:string, message:string):void {
		const eventData:TwitchatDataTypes.MessageNoticeData = {
			channel_id: channel,
			id:Utils.getUUID(),
			type:"notice",
			date:Date.now(),
			platform:"twitch",
			message:message,
			noticeId:id,
		};
		this.dispatchEvent(new MessengerClientEvent("NOTICE", eventData));
	}

}