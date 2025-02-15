import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { JsonObject } from "type-fest";
import { reactive } from "vue";
import Config from "@/utils/Config";
import { EventDispatcher } from "@/events/EventDispatcher";
import PublicAPI from "@/utils/PublicAPI";
import type { SearchPlaylistItem, SearchPlaylistResult, SearchTrackItem, SearchTrackResult, SpotifyAuthToken, SpotifyTrack } from "./SpotifyDataTypes";
import SpotifyHelperEvent from "./SpotifyHelperEvent";
import TriggerActionHandler from "@/utils/triggers/TriggerActionHandler";
import TwitchatEvent from "@/events/TwitchatEvent";
import Utils from "@/utils/Utils";

/**
* Created : 23/05/2022 
*/
export default class SpotifyHelper extends EventDispatcher {
	
	public isPlaying = false;
	public currentTrack!:TwitchatDataTypes.MusicTrackData;

	private static _instance:SpotifyHelper;
	private _token!:SpotifyAuthToken;
	private _refreshTimeout!:number;
	private _getTrackTimeout!:number;
	private _lastTrackInfo!:TwitchatDataTypes.MusicTrackData|null;
	private _headers!:{"Accept":string, "Content-Type":string, "Authorization":string};
	private _clientID = "";
	private _clientSecret = "";
	private _playlistsCache:SearchPlaylistItem[] = [];

	constructor() {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():SpotifyHelper {
		if(!SpotifyHelper._instance) {
			SpotifyHelper._instance = reactive(new SpotifyHelper()) as SpotifyHelper;
			SpotifyHelper._instance.initialize();
		}
		return SpotifyHelper._instance;
	}
	
	public set token(value:SpotifyAuthToken | null) {
		if(value == null) {
			clearTimeout(this._refreshTimeout);
			clearTimeout(this._getTrackTimeout);
			return;
		}
		this._token = value;
		this._headers = {
			"Accept":"application/json",
			"Content-Type":"application/json",
			"Authorization":"Bearer "+this._token.access_token,
		}
		// if(Date.now() > value.expires_at - 10 * 60 * 1000) {
		// 	this.refreshToken();
		// }else{
		// 	this.getCurrentTrack();
		// }
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public setAppParams(clientID:string, clientSecret:string):void {
		this._clientID = clientID;
		this._clientSecret = clientSecret;
	}
	/**
	 * Starts the aut flow
	 */
	public async startAuthFlow():Promise<void> {
		const headers = {
			'App-Version': import.meta.env.PACKAGE_VERSION,
		};
		const res = await fetch(Config.instance.API_PATH+"/auth/CSRFToken", {method:"GET", headers});
		const json = await res.json();
		const scopes = Config.instance.SPOTIFY_SCOPES.split(" ").join("%20");
		console.log(scopes);

		let url = "https://accounts.spotify.com/authorize";
		url += "?client_id="+this.clientID;
		url += "&response_type=code";
		url += "&redirect_uri="+encodeURIComponent( document.location.origin+"/spotify/auth" );
		url += "&scope=+"+scopes;
		url += "&state="+json.token;
		url += "&show_dialog=true";

		document.location.href = url;
	}

	/**
	 * Authenticate the user after receiving the auth_code once
	 * oauth flow completes.
	 * 
	 * @param authCode 
	 */
	public async authenticate(authCode:string):Promise<void> {
		let json:SpotifyAuthToken = {} as SpotifyAuthToken;
		let url = Config.instance.API_PATH+"/spotify/auth";
		url += "?code="+encodeURIComponent(authCode);
		if(this.clientID && this._clientSecret) {
			url += "&clientId="+encodeURIComponent(this.clientID);
			url += "&clientSecret="+encodeURIComponent(this._clientSecret);
		}
		const headers = {
			'App-Version': import.meta.env.PACKAGE_VERSION,
		};
		const res = await fetch(url, {method:"GET", headers});
		json = await res.json();
		if(json.access_token) {
			this.dispatchEvent(new SpotifyHelperEvent(SpotifyHelperEvent.CONNECTED, json));
		}else{
			throw(json);
		}
	}

	/**
	 * Refresh the current token
	 */
	public async refreshToken(attempt:number = 0):Promise<void> {
		clearTimeout(this._getTrackTimeout);
		clearTimeout(this._refreshTimeout);

		let json:SpotifyAuthToken = {} as SpotifyAuthToken;
		let url = new URL(Config.instance.API_PATH+"/spotify/refresh_token");
		url.searchParams.append("token", this._token.refresh_token);
		if(this.clientID && this._clientSecret) {
			url.searchParams.append("clientId", this.clientID);
			url.searchParams.append("clientSecret", this._clientSecret);
		}
		const headers = {
			'App-Version': import.meta.env.PACKAGE_VERSION,
		};
		const res = await fetch(url, {method:"GET", headers});
		let refreshSuccess = false;
		if(res.status == 200) {
			try {
				json = await res.json();
				if(json.access_token) {
					json.refresh_token = this._token.refresh_token;//Keep refresh token
			
					//Refresh token 10min before it actually expires
					const delay = Math.max(1000, (json.expires_in * 1000) - 10 * 60 * 1000);
					console.log("[SPOTIFY] Refresh token in ", delay);
					if(!isNaN(delay)) {
						this._refreshTimeout = setTimeout(()=>this.refreshToken(), delay);
					}
					this._headers = {
						"Accept":"application/json",
						"Content-Type":"application/json",
						"Authorization":"Bearer "+this._token.access_token,
					}
					
					this.dispatchEvent(new SpotifyHelperEvent(SpotifyHelperEvent.CONNECTED, json));
					refreshSuccess = true;
				}
			}catch(error) {
				console.log("[SPOTIFY] Token refresh failed");
				console.log(error);
			}
		}
		if(!refreshSuccess){
			//Refresh failed, try again
			if(attempt < 5) {
				this._refreshTimeout = setTimeout(()=>{
					this.refreshToken(++attempt);
				}, 5000);
			}else{
				//Try too many times, give up and show alert
				this.dispatchEvent(new SpotifyHelperEvent(SpotifyHelperEvent.ERROR, null, StoreProxy.i18n.t("error.spotify.token_refresh")));
			}
		}
	}

	/**
	 * Get a track by its ID
	 * 
	 * @returns track info
	 */
	public async getTrackByID(id:string, isRetry:boolean = false):Promise<SearchTrackItem|null> {
		const options = {
			headers:this._headers
		}
		const res = await fetch("https://api.spotify.com/v1/tracks/"+encodeURIComponent(id), options);
		if(res.status == 401) {
			await this.refreshToken();
			//Try again
			if(!isRetry) return await this.getTrackByID(id, true);
			else return null;
		}
		return await res.json();
	}

	/**
	 * Adds a track to the queue
	 * 
	 * @returns if a track has been found or not
	 */
	public async searchTrack(name:string, isRetry:boolean = false):Promise<SearchTrackItem|null> {
		const options = {
			headers:this._headers
		}
		const res = await fetch("https://api.spotify.com/v1/search?type=track&q="+encodeURIComponent(name), options);
		if(res.status == 401) {
			await this.refreshToken();
			//Try again
			if(!isRetry) return await this.searchTrack(name, true);
			else return null;
		}
		const json = await res.json();
		const tracks = json.tracks as SearchTrackResult;
		if(tracks.items.length == 0) {
			return null;
		}else{
			return tracks.items[0];
		}
	}

	/**
	 * Adds a track to the queue
	 * 
	 * @returns if a track has been found or not
	 */
	public async searchPlaylist(name:string, isRetry:boolean = false):Promise<SearchPlaylistItem|null> {
		const options = {
			headers:this._headers
		}
		const res = await fetch("https://api.spotify.com/v1/search?type=playlist&q="+encodeURIComponent(name), options);
		if(res.status == 401) {
			await this.refreshToken();
			//Try again
			if(!isRetry) return await this.searchPlaylist(name, true);
			else return null;
		}
		const json = await res.json();
		const tracks = json.playlists as SearchPlaylistResult;
		if(tracks.items.length == 0) {
			return null;
		}else{
			return tracks.items[0];
		}
	}

	/**
	 * Adds a track to the queue
	 * 
	 * @param uri Spotify URI of the track to add. Get one with "searchTrack()" method
	 * @returns if a track has been added or not
	 */
	public async addToQueue(uri:string, isRetry:boolean = false):Promise<boolean> {
		const options = {
			headers:this._headers,
			method:"POST",
		}
		const res = await fetch("https://api.spotify.com/v1/me/player/queue?uri="+encodeURIComponent(uri), options);
		if(res.status == 204) {
			return true;
		}else
		if(res.status == 401) {
			await this.refreshToken();
			//Try again
			if(!isRetry) return await this.addToQueue(uri, true);
			else return false;
		}else
		if(res.status == 409) {
			this.dispatchEvent(new SpotifyHelperEvent(SpotifyHelperEvent.ERROR, null, StoreProxy.i18n.t("error.spotify.api_rate")));
		}else {
			try {
				const json = await res.json();
				if(json.error.message) {
					this.dispatchEvent(new SpotifyHelperEvent(SpotifyHelperEvent.ERROR, null, "[SPOTIFY] "+json.error.message));
				}else {
					throw(new Error(""))
				}
			}catch(error) {
				this.dispatchEvent(new SpotifyHelperEvent(SpotifyHelperEvent.ERROR, null, "[SPOTIFY] an unknown error occurred when adding a track to the queue. Server responded with HTTP status:"+res.status));
			}
		}
		return false;
	}

	/**
	 * Get the currently playing track
	 * This starts a routine that automatically checks for new
	 * track info.
	 */
	public async getCurrentTrack():Promise<void> {
		clearTimeout(this._getTrackTimeout);

		const options = {
			headers:this._headers
		}
		let res!:Response;
		try {
			res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", options);
			if(res.status > 401) throw("error");
		}catch(error) {
			//API crashed, try again 5s later
			this._getTrackTimeout = setTimeout(()=> this.getCurrentTrack(), 5000);
			return;
		}
		if(res.status == 401) {
			await this.refreshToken();
			this._getTrackTimeout = setTimeout(()=> this.getCurrentTrack(), 1000);
			return;
		}
		if(res.status == 204) {
			//No content, nothing is playing
			this._getTrackTimeout = setTimeout(()=> this.getCurrentTrack(), 10000);
			return;
		}
		
		let json:SpotifyTrack|null = await res.json();
		if(json?.currently_playing_type == "episode") {
			const episode = await this.getEpisodeInfos();
			if(episode) json = episode;
		}

		if(json?.item) {
			this.currentTrack = {
				title:json.item.name,
				artist:json.item.show? json.item.show.name : json.item.artists[0].name,
				album:json.item.album? json.item.album.name : "",
				cover:json.item.show? json.item.show.images[0].url : json.item.album.images[0].url,
				duration:json.item.duration_ms,
				url:json.item.external_urls.spotify,
			};
			this.isPlaying = json.is_playing && json.item != null;
	
			if(this.isPlaying) {
				let delay = json.item.duration_ms - json.progress_ms;
				if(isNaN(delay)) delay = 5000;
				this._getTrackTimeout = setTimeout(()=> {
					this.getCurrentTrack();
				}, Math.min(5000, delay + 1000));
				
				//Broadcast to the triggers
				if(!this._lastTrackInfo
				|| this._lastTrackInfo?.duration != this.currentTrack.duration 
				|| this._lastTrackInfo?.title != this.currentTrack.title
				|| this._lastTrackInfo?.artist != this.currentTrack.artist) {
					const message:TwitchatDataTypes.MessageMusicStartData = {
						id:Utils.getUUID(),
						date:Date.now(),
						type:TwitchatDataTypes.TwitchatMessageType.MUSIC_START,
						platform:"twitchat",
						track:this.currentTrack
					};
					StoreProxy.chat.addMessage(message);
				}
				
				//Broadcast to the overlays
				const apiData = {
					trackName: this.currentTrack.title,
					artistName: this.currentTrack.artist,
					trackDuration: this.currentTrack.duration,
					trackPlaybackPos: json.progress_ms,
					cover: this.currentTrack.cover,
					params: StoreProxy.music.musicPlayerParams,
				}
				PublicAPI.instance.broadcast(TwitchatEvent.CURRENT_TRACK, (apiData as unknown) as JsonObject);

				this._lastTrackInfo = this.currentTrack;

			}else{
				//Broadcast to the overlays
				if(this._lastTrackInfo != null) {
					PublicAPI.instance.broadcast(TwitchatEvent.CURRENT_TRACK, {
						params: (StoreProxy.music.musicPlayerParams as unknown) as JsonObject,
					});

					//Broadcast to the triggers
					const message:TwitchatDataTypes.MessageMusicStopData = {
						id:Utils.getUUID(),
						date:Date.now(),
						type:TwitchatDataTypes.TwitchatMessageType.MUSIC_STOP,
						platform:"twitchat",
						track:this.currentTrack
					};
					StoreProxy.chat.addMessage(message);

					this._lastTrackInfo = null;
				}
				this._getTrackTimeout = setTimeout(()=> { this.getCurrentTrack(); }, 5000);
			}
		}
	}

	/**
	 * Gets a playlist by its name
	 * 
	 * @returns track info
	 */
	public async getUserPlaylist(id:string|null, name?:string):Promise<SearchPlaylistItem|null> {
		if(this._playlistsCache.length === 0) {
			const options = {
				headers:this._headers
			}
			let offset = 0;
			const limit = 50;
			let playlists:SearchPlaylistItem[] = [];
			let json:JsonObject;
			do {
				const res = await fetch("https://api.spotify.com/v1/me/playlists?limit="+limit+"&offset="+offset, options);
				json = await res.json();
				offset += limit;
				playlists = playlists.concat((json.items as unknown) as SearchPlaylistItem[]);
			}while(json.next);
			this._playlistsCache = playlists;
		}

		let minDist = 10;
		let selected:SearchPlaylistItem|null = null;
		for (let i = 0; i < this._playlistsCache.length; i++) {
			const p = this._playlistsCache[i];
			if(id === p.id ) return p;
			if(name){
				const dist = Utils.levenshtein(name, p.name);
				if(dist < minDist) {
					minDist = dist;
					selected = p;
				}
			}
		}
		return selected;
	}

	/**
	 * Plays next track in queue
	 * @returns 
	 */
	public async nextTrack():Promise<boolean> {
		return this.simpleAction("me/player/next", "POST");
	}

	/**
	 * Pause the playback
	 * @returns 
	 */
	public async pause():Promise<boolean> {
		return this.simpleAction("me/player/pause", "PUT");
	}

	/**
	 * Resume/starts the playback
	 * @returns 
	 */
	public async resume():Promise<boolean> {
		return this.simpleAction("me/player/play", "PUT");
	}

	/**
	 * Starts playing a playlist
	 * @returns 
	 */
	public async startPlaylist(id:string|null, name?:string):Promise<boolean> {
		let res = await this.getUserPlaylist(id, name);
		if(!res && name) {
			res = await this.searchPlaylist(name);
		}
		if(res) {
			return this.simpleAction("me/player/play", "PUT", {context_uri: res.uri});
		}
		return false;
	}

	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_CURRENT_TRACK, ()=>this.getCurrentTrack());
	}

	/**
	 * Executes a simplea ction that requires no param
	 * @param path 
	 * @returns success or not
	 */
	public async simpleAction(path:string, method:"POST"|"PUT"|"GET", body?:JsonObject):Promise<boolean> {
		const options:{[key:string]:unknown} = {
			headers:this._headers,
			method,
		}
		if(body) options.body = JSON.stringify(body);
		const res = await fetch("https://api.spotify.com/v1/"+path, options);
		if(res.status == 401) {
			await this.refreshToken();
			return false;
		}
		if(res.status == 204) {
			return true;
		}
		if(res.status == 404) {
			try {
				const json = await res.json();
				if(json.error?.reason == "NO_ACTIVE_DEVICE") {
					StoreProxy.main.alertData = StoreProxy.i18n.t("music.spotify_play");
				}
			}catch(error){
				this.dispatchEvent(new SpotifyHelperEvent(SpotifyHelperEvent.ERROR, null, "[SPOTIFY] an unknown error occurred when calling endpoint "+path+"("+method+"). Server responded with HTTP status:"+res.status));
			}
		}else
		if(res.status == 409) {
			this.dispatchEvent(new SpotifyHelperEvent(SpotifyHelperEvent.ERROR, null, StoreProxy.i18n.t("error.spotify.api_rate")));
		}else {
			try {
				const json = await res.json();
				if(json.error.message) {
					this.dispatchEvent(new SpotifyHelperEvent(SpotifyHelperEvent.ERROR, null, "[SPOTIFY] "+json.error.message));
				}else {
					throw(new Error(""))
				}
			}catch(error) {
				this.dispatchEvent(new SpotifyHelperEvent(SpotifyHelperEvent.ERROR, null, "[SPOTIFY] an unknown error occurred when calling endpoint "+path+"("+method+"). Server responded with HTTP status:"+res.status));
			}
		}
		return false;
	}

	/**
	 * Gets a podcast infos
	 */
	private async getEpisodeInfos():Promise<SpotifyTrack|null> {
		const options = {
			headers:this._headers
		}
		const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=episode", options);
		if(res.status == 401) {
			await this.refreshToken();
			return null;
		}
		return await res.json();
	}

	private get clientID():string {
		let clientID = Config.instance.SPOTIFY_CLIENT_ID;
		if(this._clientID) {
			clientID = this._clientID;
		}
		return clientID;
	}

}