<template>
	<div class="triggeractionvoicemodentry" v-if="!vmConnected">
		<div class="item info warn">
			<img src="@/assets/icons/infos.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.voicemod.header">
				<template #LINK>
					<a @click="$emit('setContent', contentVM)">{{ $t("triggers.actions.voicemod.header_link") }}</a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div class="triggeractionvoicemodentry" v-else>
		<ParamItem :paramData="param_voiceList" v-model="action.voiceID" />
	</div>
</template>

<script lang="ts">
import type { TriggerActionVoicemodData, TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';

@Component({
	components:{
		ParamItem,
	},
	emits:["update"]
})
export default class TriggerActionVoicemodEntry extends Vue {
	
	@Prop
	public action!:TriggerActionVoicemodData;
	@Prop
	public event!:TriggerEventTypes;

	public param_voiceList:TwitchatDataTypes.ParameterData = {type:"list", label:"", listValues:[], value:""}
	
	public get vmConnected():boolean { return VoicemodWebSocket.instance.connected; }
	public get contentVM():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.VOICEMOD; } 

	public beforeMount():void {
		this.param_voiceList.labelKey = "triggers.actions.voicemod.param_voice";
		if(this.vmConnected) {
			this.param_voiceList.listValues = VoicemodWebSocket.instance.voices.map(v=>{
				return {
					label:v.friendlyName,
					value:v.voiceID,
				}
			});
		}
	}

}
</script>

<style scoped lang="less">
.triggeractionvoicemodentry{
	.triggerActionForm();
}
</style>