<template>
	<div class="paramsvoicebot">
		<img src="@/assets/icons/voice_purple.svg" alt="voice icon" class="icon">
		<div class="head">{{ $t("voice.header") }}</div>
		
		<div v-if="!voiceApiAvailable" class="noApi">
			<p>{{ $t("voice.unsupported_browser") }}</p>
			<p class="infos">{{ $t("voice.unsupported_browser_detail") }}</p>
		</div>
		<div v-else class="infos">{{ $t("voice.supported_browsers") }}</div>

		<div v-if="!voiceApiAvailable || true" class="fallback">
			<p>{{ $t("voice.remote_control") }}</p>
			<a :href="voicePageUrl" target="_blank">{{voicePageUrl}}</a>
		</div>

		<div>
			<VoiceControlForm v-if="obsConnected" class="form" :voiceApiAvailable="voiceApiAvailable" />
			<div class="connectObs" v-if="!obsConnected">
				<div>{{ $t("voice.need_OBS") }}</div>
				<Button class="button" :title="$t('voice.obs_connectBt')" white @click="$emit('setContent', contentObs)" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import OBSWebsocket from '@/utils/OBSWebsocket';
import { Component, Vue } from 'vue-facing-decorator';
import VoiceControlForm from '../../voice/VoiceControlForm.vue';
import Button from '../../Button.vue';
import VoiceController from '@/utils/voice/VoiceController';
import Config from '@/utils/Config';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{
		Button,
		VoiceControlForm,
	},
	emits:["setContent"]
})
export default class ParamsVoiceBot extends Vue {
	
	public get contentObs():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.OBS; } 

	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get voicePageUrl():string {
		let url = document.location.origin;
		url += this.$router.resolve({name:"voice"}).href;
		return url;
	}

	public get voiceApiAvailable():boolean {
		return VoiceController.instance.apiAvailable && !Config.instance.OBS_DOCK_CONTEXT;
	}

}

</script>

<style scoped lang="less">
.paramsvoicebot{
	.parameterContent();
	
	.infos {
		font-size: .9em;
		text-align: center;
	}
	.form {
		margin-top: 1em;
	}

	.noApi, 
	.connectObs {
		text-align: center;
		color: @mainColor_light;
		background-color: @mainColor_alert;
		padding: .5em;
		border-radius: .5em;
		margin-top: 1em;

		.button {
			margin-top: .5em;
		}
	}

	.fallback {
		font-size: .8em;
		line-height: 1.2em;
		margin-top: 1em;
		border: 1px solid @mainColor_normal;
		border-radius: .5em;
		padding: .5em;
	}
}
</style>