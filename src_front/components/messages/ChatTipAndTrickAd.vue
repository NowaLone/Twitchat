<template>
	<div class="chattipandtrickad">
		<div v-if="tipIndex===0" class="entry">
			<img src="@/assets/icons/obs_purple.svg" alt="elgato" class="icon">
			<h1 class="row">{{ $t("tips.alerts.title") }}</h1>
			<div class="row">{{ $t("tips.alerts.info_1") }}</div>
			<div class="row">{{ $t('tips.alerts.info_2') }}</div>
			<Button :title="$t('tips.tryBt')" @click.stop="openParam(contentTriggers)" />
		</div>
		
		<div v-if="tipIndex===1" class="entry">
			<img src="@/assets/icons/elgato_purple.svg" alt="elgato" class="icon">
			<h1 class="row">{{ $t('tips.streamdeck.title') }}</h1>
			<div class="row">{{ $t('tips.streamdeck.info_1') }}</div>
			<div class="row">{{ $t('tips.streamdeck.info_2') }}</div>
			<Button :title="$t('tips.tryBt')" @click.stop="openParam(contentStreamdeck)" />
		</div>
		
		<div v-if="tipIndex===2" class="entry">
			<img src="@/assets/icons/raid_purple.svg" alt="raid" class="icon">
			<h1 class="row">{{ $t('tips.obs_stop.title') }}</h1>
			<div class="row">{{ $t('tips.obs_stop.info_1') }}</div>
			<Button :title="$t('tips.tryBt')" @click.stop="openParamItem('features.stopStreamOnRaid')" />
		</div>
		
		<div v-if="tipIndex===3" class="entry">
			<img src="@/assets/icons/bingo_purple.svg" alt="bingo" class="icon">
			<h1 class="row">{{ $t('tips.bingo.title') }}</h1>
			<div class="row">{{ $t('tips.bingo.info_1') }}</div>
			<Button :title="$t('tips.tryBt')" @click.stop="openModal('bingo')" />
		</div>
		
		<div v-if="tipIndex===4" class="entry">
			<img src="@/assets/icons/ticket_purple.svg" alt="raffle" class="icon">
			<h1 class="row">{{ $t('tips.raffle.title') }}</h1>
			<div class="row">{{ $t('tips.raffle.info_1') }}</div>
			<div class="row">{{ $t('tips.raffle.info_2') }}</div>
			<div class="row">{{ $t('tips.raffle.info_3') }}</div>
			<Button :title="$t('tips.tryBt')" @click.stop="openModal('raffle')" />
		</div>
		
		<div v-if="tipIndex===5" class="entry">
			<img src="@/assets/icons/obs_purple.svg" alt="obs" class="icon">
			<h1 class="row">{{ $t('tips.obs.title') }}</h1>
			<div class="row">{{ $t('tips.obs.info_1') }}</div>
			<div class="row">{{ $t('tips.obs.info_2') }}</div>
			<Button :title="$t('tips.tryBt')" @click.stop="openParam(contentObs)" />
		</div>
		
		<div v-if="tipIndex===6" class="entry">
			<img src="@/assets/icons/api_purple.svg" alt="api" class="icon">
			<h1 class="row">{{ $t('tips.api.title') }}</h1>
			<div class="row">{{ $t('tips.api.info_1') }}</div>
			<div class="row">{{ $t('tips.api.info_2') }}</div>
			<Button :icon="$image('icons/github_white.svg')"
				style="display: inline-block;"
				:title="$t('tips.api.readBt')"
				href="https://github.com/Durss/Twitchat/blob/main/PUBLIC_API.md"
				target="_blank"
				type="link"
			/>
		</div>
		
		<div v-if="tipIndex===7" class="entry">
			<img src="@/assets/icons/music_purple.svg" alt="music" class="icon">
			<h1 class="row">{{ $t('tips.music.title') }}</h1>
			<div class="row" v-html="$t('tips.music.info_1')"></div>
			<div class="row">{{ $t('tips.music.info_2') }}</div>
			<div class="row">{{ $t('tips.music.info_3') }}</div>
			<Button :title="$t('tips.tryBt')" @click.stop="openParam(contentOverlays)" />
		</div>
		
		<div v-if="tipIndex===8" class="entry">
			<img src="@/assets/icons/overlay_purple.svg" alt="overlay" class="icon">
			<h1 class="row">{{ $t('tips.overlays.title') }}</h1>
			<div class="row" v-html="$t('tips.overlays.info_1')"></div>
			<div class="row" v-html="$t('tips.overlays.info_2')"></div>
			<Button :title="$t('tips.tryBt')" @click.stop="openParam(contentOverlays)" />
		</div>
		
		<div v-if="tipIndex===9" class="entry">
			<img src="@/assets/icons/countdown_purple.svg" alt="timer" class="icon">
			<h1 class="row">{{ $t('tips.countdown.title') }}</h1>
			<i18n-t scope="global" class="row" tag="div" keypath="tips.countdown.info_1">
				<template #CMD1><span class="cmd">/timerStart</span></template>
				<template #CMD2><span class="cmd">/countdown</span></template>
			</i18n-t>
			<Button :icon="$image('icons/timer.svg')" :title="$t('tips.countdown.timer_tryBt')" @click.stop="startTimer()" />
			<Button :icon="$image('icons/countdown.svg')" :title="$t('tips.countdown.countdown_tryBt')" @click.stop="startCountdown()" />
		</div>
		
		<div v-if="tipIndex===10" class="entry">
			<img src="@/assets/icons/obs_purple.svg" alt="obs dock" class="icon">
			<h1 class="row">{{ $t('tips.dock.title') }}</h1>
			<div class="row" v-html="$t('tips.dock.info_1')"></div>
			<div class="row" v-html="$t('tips.dock.info_2')"></div>
			<img class="row" src="@/assets/img/obs_dock.png" alt="obs dock screen">
		</div>
		
		<div v-if="tipIndex===11" class="entry">
			<img src="@/assets/icons/highlight_purple.svg" alt="chat highlight" class="icon">
			<h1 class="row">{{ $t('tips.highlight.title') }}</h1>
			<div class="row">{{ $t('tips.highlight.info_1') }}</div>
			<div class="row">{{ $t('tips.highlight.info_2') }}</div>
			
			<!-- <img class="row" src="@/assets/img/chatHighlightedMessage.png" alt="obs dock screen"> -->
			<iframe class="row" src="https://www.youtube.com/embed/x9RCqbRm6A8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

			<Button class="row" :title="$t('tips.highlight.config_overlayBt')" @click.stop="openParam(contentOverlays)" :icon="$image('icons/overlay.svg')" />
			<div class="row or">{{ $t("global.or") }}</div>
			<Button class="row" :title="$t('tips.highlight.configure_triggerBt')" @click.stop="openParam(contentTriggers)" :icon="$image('icons/broadcast.svg')" />
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';

@Component({
	components:{
		Button,
	},
	emits:["showModal", "openParam", "openParamItem", "onRead"]
})
export default class ChatTipAndTrickAd extends Vue {

	public tipIndex = 0;
	private maxIndex = 11;

	public get contentOverlays() { return TwitchatDataTypes.ParamsCategories.OVERLAYS; }
	public get contentTriggers() { return TwitchatDataTypes.ParamsCategories.TRIGGERS; }
	public get contentObs() { return TwitchatDataTypes.ParamsCategories.OBS; }
	public get contentStreamdeck() { return TwitchatDataTypes.ParamsCategories.STREAMDECK; }

	public beforeMount():void {
		this.tipIndex = Math.floor(Math.random()*(this.maxIndex+1));
	}

	public openModal(modal:string):void { this.$emit("showModal", modal); }
	public openParam(modal:TwitchatDataTypes.ParamsContentStringType):void { this.$emit("openParam", modal); }
	public openParamItem(paramPath:string):void { this.$emit("openParamItem", paramPath); }
	public startTimer():void { this.$store("timer").timerStart(); }
	public startCountdown():void { this.$store("timer").countdownStart(2 * 60 * 1000); }

}
</script>

<style scoped lang="less">
.chattipandtrickad{
	.entry {
		.icon {
			height: 4em;
			width: 4em;
			margin-bottom: .5em;
		}
		.row:not(:last-child) {
			margin-bottom: .5em;
		}

		.cmd {
			background-color: fade(@mainColor_normal, 15%);
			border-radius: .5em;
			padding: 0 .5em;
			font-family: 'Courier New', Courier, monospace;
		}
		
		.button {
			display: block;
			margin: auto;
			&:not(:first-of-type) {
				margin-top: .5em;
			}
		}
		
		img {
			max-width: 100%;
		}

		iframe {
			width: 80%;
			max-width: 300px;
			aspect-ratio: 16/9;
		}
		.or {
			text-transform: uppercase;
		}
	}
}
</style>