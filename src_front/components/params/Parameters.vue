<template>
	<div class="parameters" v-if="$store('main').showParams">
		<div class="dimmer" ref="dimmer" @click="close()" v-if="$store('main').showParams"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<Button :aria-label="$t('params.backBt_aria')" :icon="$image('icons/back_purple.svg')" @click="back()" class="backBt clearButton" bounce v-if="content != null" />
				<h1 class="title">{{(titleKey?$t('params.categories.'+titleKey) : $t('params.title_default'))}}</h1>
				<Button :aria-label="$t('params.closeBt_aria')" :icon="$image('icons/cross.svg')" @click="close()" class="clearButton" bounce />
			</div>

			<div class="search" v-if="content == null">
				<input type="text" :placeholder="$t('params.search')" v-model="search" v-autofocus>
			</div>
			
			<div class="content menu" v-if="content == null && !search || content == contentAd">
				<div ref="adNoDonor"></div>

				<div class="buttonList" v-if="content != contentAd">
					<Button bounce white :icon="$image('icons/params_purple.svg')"		:title="$t('params.categories.features')"		@click="setContent(contentFeatures)" />
					<Button bounce white :icon="$image('icons/show_purple.svg')"		:title="$t('params.categories.appearance')"		@click="setContent(contentAppearance)" />
					<Button bounce white :icon="$image('icons/emergency_purple.svg')"	:title="$t('params.categories.emergency')"		@click="setContent(contentEmergency)" />
					<Button bounce white :icon="$image('icons/mod_purple.svg')"			:title="$t('params.categories.automod')"		@click="setContent(contentAutomod)" />
					<Button bounce white :icon="$image('icons/broadcast_purple.svg')"	:title="$t('params.categories.triggers')"		@click="setContent(contentTriggers)" />
					<Button bounce white :icon="$image('icons/count_purple.svg')"		:title="$t('params.categories.counters')"		@click="setContent(contentCounters)" />
					<Button bounce white :icon="$image('icons/overlay_purple.svg')"		:title="$t('params.categories.overlays')"		@click="setContent(contentOverlays)" />
					<Button bounce white :icon="$image('icons/tts_purple.svg')"			:title="$t('params.categories.tts')"			@click="setContent(contentTts)" />
					<Button bounce white :icon="$image('icons/voice_purple.svg')"		:title="$t('params.categories.voice')"			@click="setContent(contentVoice)" />
					<Button bounce white :icon="$image('icons/obs_purple.svg')"			:title="$t('params.categories.obs')"			@click="setContent(contentObs)" />
					<Button bounce white :icon="$image('icons/voicemod_purple.svg')"	:title="$t('params.categories.voicemod')"		@click="setContent(contentVoicemod)" />
					<Button bounce white :icon="$image('icons/elgato_purple.svg')"		:title="$t('params.categories.streamdeck')"		@click="setContent(contentStreamdeck)" />
					<Button bounce white :icon="$image('icons/offline_purple.svg')"		:title="$t('params.categories.connexions')"		@click="setContent(contentConnexions)" />
					<Button bounce white :icon="$image('icons/user_purple.svg')"		:title="$t('params.categories.account')"		@click="setContent(contentAccount)" />
					<Button bounce white :icon="$image('icons/info_purple.svg')"		:title="$t('params.categories.about')"			@click="setContent(contentAbout)" />
				</div>

				<div ref="adDonor"></div>

				<div class="version" v-if="content != contentAd">v {{appVersion}}</div>
			</div>
			
			<div class="content" v-if="(content != null && content != contentAd) || search">
				<ParamsList v-if="(content && isGenericListContent) || filteredParams.length > 0" :category="content" :filteredParams="filteredParams" @setContent="setContent" />
				<ParamsStreamdeck v-if="content == contentStreamdeck" @setContent="setContent" />
				<ParamsOBS v-if="content == contentObs" @setContent="setContent" />
				<ParamsEmergency v-if="content == contentEmergency" @setContent="setContent" />
				<ParamsTTS v-if="content == contentTts" @setContent="setContent" />
				<ParamsSpoiler v-if="content == contentSpoiler" @setContent="setContent" />
				<ParamsAlert v-if="content == contentAlert" @setContent="setContent" />
				<ParamsAccount v-if="content == contentAccount" @setContent="setContent" />
				<ParamsAbout v-if="content == contentAbout" @setContent="setContent" />
				<ParamsOverlays v-if="content == contentOverlays" @setContent="setContent" />
				<ParamsTriggers v-if="content == contentTriggers" @setContent="setContent" />
				<ParamsVoiceBot v-if="content == contentVoice" @setContent="setContent" />
				<ParamsVoicemod v-if="content == contentVoicemod" @setContent="setContent" />
				<ParamsAutomod v-if="content == contentAutomod" @setContent="setContent" />
				<ParamsCounters v-if="content == contentCounters" @setContent="setContent" />
				<ParamsConnexions v-if="content == contentConnexions" @setContent="setContent" />
				<!-- Used for direct link to sponsor content from chat ads -->
				<ParamsSponsor v-if="content == contentSponsor" @setContent="setContent" />

				<div class="searchResult" v-if="search">
					<div class="noResult" v-if="filteredParams.length == 0">{{ $t("params.search_no_result") }}</div>
				</div>
			</div>

			<teleport :to="adTarget" v-if="adTarget">
				<ParamsTwitchatAd @setContent="setContent" :expand="content == contentAd" @collapse="content = null" />
			</teleport>
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import ChatMessage from '../messages/ChatMessage.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ToggleButton from '../ToggleButton.vue';
import ParamsAbout from './contents/ParamsAbout.vue';
import ParamsAccount from './contents/ParamsAccount.vue';
import ParamsAlert from './contents/ParamsAlert.vue';
import ParamsAutomod from './contents/ParamsAutomod.vue';
import ParamsCounters from './contents/ParamsCounters.vue';
import ParamsEmergency from './contents/ParamsEmergency.vue';
import ParamsList from './contents/ParamsList.vue';
import ParamsOBS from './contents/ParamsOBS.vue';
import ParamsOverlays from './contents/ParamsOverlays.vue';
import ParamsSpoiler from './contents/ParamsSpoiler.vue';
import ParamsSponsor from './contents/ParamsSponsor.vue';
import ParamsStreamdeck from './contents/ParamsStreamdeck.vue';
import ParamsTriggers from './contents/ParamsTriggers.vue';
import ParamsTTS from './contents/ParamsTTS.vue';
import ParamsTwitchatAd from './contents/ParamsTwitchatAd.vue';
import ParamsVoiceBot from './contents/ParamsVoiceBot.vue';
import ParamsVoicemod from './contents/ParamsVoicemod.vue';
import ParamItem from './ParamItem.vue';
import PostOnChatParam from './PostOnChatParam.vue';
import ParamsConnexions from './contents/ParamsConnexions.vue';

@Component({
	components:{
		Button,
		ParamItem,
		ParamsOBS,
		ParamsTTS,
		ParamsList,
		ChatMessage,
		ParamsAbout,
		ParamsAlert,
		ToggleBlock,
		ToggleButton,
		ParamsAutomod,
		ParamsSpoiler,
		ParamsAccount,
		ParamsSponsor,
		ParamsCounters,
		ParamsOverlays,
		ParamsTriggers,
		ParamsVoiceBot,
		ParamsVoicemod,
		ParamsEmergency,
		PostOnChatParam,
		ParamsStreamdeck,
		ParamsTwitchatAd,
		ParamsConnexions,
	}
})

export default class Parameters extends Vue {

	public search:string = "";
	public titleKey:string|null = null;
	public filteredParams:TwitchatDataTypes.ParameterData[] = [];
	public content:TwitchatDataTypes.ParamsContentStringType|null = null;
	public adTarget:HTMLDivElement | null = null;
	
	private closing:boolean = false;
	private prevContent:TwitchatDataTypes.ParamsContentStringType|null = null;

	public get isDonor():boolean { return this.$store("auth").twitch.user.donor.state; }
	public get contentAd():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.AD; } 
	public get contentAppearance():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.APPEARANCE; } 
	public get contentAccount():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.ACCOUNT; } 
	public get contentAbout():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.ABOUT; } 
	public get contentFeatures():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.FEATURES; } 
	public get contentObs():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.OBS; } 
	public get contentVoicemod():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.VOICEMOD; } 
	public get contentSponsor():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.SPONSOR; } 
	public get contentStreamdeck():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.STREAMDECK; } 
	public get contentTriggers():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.TRIGGERS; } 
	public get contentCounters():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.COUNTERS; } 
	public get contentOverlays():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.OVERLAYS; } 
	public get contentEmergency():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.EMERGENCY; } 
	public get contentSpoiler():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.SPOILER; } 
	public get contentAlert():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.ALERT; } 
	public get contentTts():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.TTS; } 
	public get contentVoice():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.VOICE; } 
	public get contentAutomod():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.AUTOMOD; } 
	public get contentConnexions():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.CONNEXIONS; } 
	
	/**
	 * If true, will display a search field at the top of the view to
	 * search params by their labels
	 */
	public get isGenericListContent():boolean {
		return this.content == "features"
			|| this.content == "appearance"
			|| this.search.length>0;
	}

	public get appVersion():string { return import.meta.env.PACKAGE_VERSION; }

	public async beforeMount():Promise<void> {
	}

	public async mounted():Promise<void> {

		if(this.$store('main').showParams) {
			this.open();
		}

		watch(() => this.$store('main').showParams, (value) => {
			if(value) this.open();
			else this.close();
		});

		watch(() => this.content, () => {
			if(this.content) this.filteredParams = [];
			if(!this.content || this.content == this.contentAd) {
				this.$nextTick().then(()=>{
					this.adTarget = this.$refs[this.isDonor? "adDonor" : "adNoDonor"] as HTMLDivElement;
				})
			}
		});

		watch(() => this.search, (value:string) => {
			this.content = null;
			this.titleKey = null;
			this.filterParams(this.search);
		});

	}

	public async open():Promise<void> {
		await this.$nextTick();

		gsap.set(this.$refs.holder as HTMLElement, {x:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.5, x:"100%", ease:"back.out"});

		this.adTarget = this.$refs[this.isDonor? "adDonor" : "adNoDonor"] as HTMLDivElement;

		if(this.search) {
			await this.$nextTick();
			this.content = null;
			this.titleKey = null;
			this.filterParams(this.search);
		}
		
		const v = this.$store("main").tempStoreValue as string;
		if(!v) return;
		if(v.indexOf("CONTENT:") === 0) {
			//Requesting sponsor page
			let pageId = v.replace("CONTENT:", "") as TwitchatDataTypes.ParamsContentStringType|null;
			if(pageId == TwitchatDataTypes.ParamsCategories.MAIN_MENU) pageId = null;
			this.content = pageId;

		}else if(v.indexOf("SEARCH:") === 0) {
			//Prefilled search
			const chunks = v.replace("SEARCH:", "").split(".");
			if(chunks.length == 2) {
				const cat = chunks[0] as TwitchatDataTypes.ParameterCategory;
				const paramKey = chunks[1];
				let label = this.$store("params").$state[cat][paramKey].label;
				let labelKey = this.$store("params").$state[cat][paramKey].labelKey;
				if(labelKey) label = this.$t(labelKey);
				this.search = label ?? "";
			}
		}
		this.$store("main").tempStoreValue = null;
	}

	public async close():Promise<void> {
		if(this.closing) return;
		this.closing = true;
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.5, x:"100%", ease:"back.in", onComplete:()=> {
			this.closing = false;
			this.filteredParams = [];
			this.$store("main").setShowParams(false);
			this.content = null;
		}});
	}

	public back():void {
		this.content = this.prevContent;
		this.titleKey = this.prevContent;
		this.prevContent = null;
	}

	public setContent(id:TwitchatDataTypes.ParamsContentStringType):void {
		this.prevContent = this.content;
		if(id == this.content) {
			//Refresh content if already active
			this.content = null;
			this.$nextTick().then(()=>{
				this.content = id;
				this.titleKey = id;
			})
		}else{
			this.content = id;
			this.titleKey = id;
		}
		if(id == null && this.search.length > 0) {
			this.search = "";
		}
	}

	public async filterParams(search:string):Promise<void> {
		this.filteredParams = [];
		const safeSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
		const IDsDone:{[key:number]:boolean} = {};
		for (const categoryID in this.$store("params").$state) {
			const category = this.$store("params").$state[categoryID as TwitchatDataTypes.ParameterCategory] as {[ley:string]:TwitchatDataTypes.ParameterData};
			for (const prop in category) {
				const data:TwitchatDataTypes.ParameterData = category[prop];
				
				//Already done (via its parent probably), ignore it
				if(IDsDone[data.id as number] === true) continue;

				let label = data.label;
				let labelKey = data.labelKey;
				if(labelKey) label = this.$t(labelKey);

				if(label && new RegExp(safeSearch, "gi").test(label)) {
					if(data.parent) {
						for (const key in category) {
							if(category[key].id == data.parent && IDsDone[category[key].id as number] !== true) {
								IDsDone[category[key].id as number] = true;
								this.filteredParams.push(category[key]);
							}
						}
					}else{
						IDsDone[data.id as number] = true;
						this.filteredParams.push(data);
					}
				}
			}
		}
	}
}
</script>

<style scoped lang="less">
.parameters{
	z-index: 3;
	.modal();

	.dimmer {
		opacity: 0;
	}
	
	.holder {
		right: 0;
		left: auto;
		transform: translateX(100%);
		z-index: 1;
		max-width: 900px;

		.head {
			border-bottom: 1px solid @mainColor_normal;
			padding-bottom: .5em;
			&:has(.backBt) {
				.title {
					padding-left: 0;
				}
			}
		}

		.menu {
			max-width: 840px;
			margin: auto;
			.buttonList {
				padding: 1em;
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				justify-content: center;
				&>.button {
					box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
					flex-direction: column;
					width: 180px;
					margin: 1px;
					padding: 1em .25em;
					justify-content: flex-start;
					:deep(.icon) {
						height: 3em;
						width: 3em;
						max-height: unset;
						max-width: unset;
						margin: 0 0 .5em 0;
						object-fit: fill;
						object-position: center center;
					}
					:deep(.label) {
						white-space: normal;
					}
	
					&.beta1, &.beta2 {
						&::before {
							content: "beta";
							position: absolute;
							top: 10px;
							right: -50px;
							background-color: @mainColor_normal;
							color: @mainColor_light;
							padding: 5px 50px;
							border-radius: 10px;
							text-transform: uppercase;
							font-size: 18px;
							transform: rotate(45deg);
						}
						&.beta2 {
							&::before {
								background: linear-gradient(-90deg, fade(@mainColor_normal, 0) 0%, fade(@mainColor_normal, 50%) 30%, fade(@mainColor_normal, 50%) 100%);
							}
						}
					}
				}
			}

			.version {
				font-style: italic;
				text-align: center;
				font-size: .8em;
				margin-top: 1em;
			}
		}

		.search{
			margin:auto;
			margin-top: 1em;
			z-index: 1;
			input {
				text-align: center;
			}
		}

		.searchResult {
			.noResult {
				text-align: center;
				font-style: italic;
			}
		}

		.content {
			//This avoids black space over sticky items inside the content
			padding: 30px;
			&:not(.menu) {
				width: 100%;
				max-width: 600px;
				margin: auto;
			}

			&::-webkit-scrollbar-thumb {
				background-color: @mainColor_normal_extralight;
			}
		}
	}

	.dimmer {
		z-index: 1;
	}

}
</style>