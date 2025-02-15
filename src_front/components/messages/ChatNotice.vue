<template>
	<div :class="classes">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<!-- {{messageData.channel}} -->
		<img :src="$image('icons/'+icon+'.svg')" alt="notice" class="icon">
		<span class="message" v-html="message"></span>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{},
	emits:["onRead"]
})
export default class ChatNotice extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageNoticeData;
	
	public icon = "infos";

	/**
	 * Gets text message with parsed emotes
	 */
	public get message():string {
		let text = this.messageData.message ?? "";
			text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;")
			text = text.replace(/&lt;(\/)?strong&gt;/gi, "<$1strong>");//Allow <strong> tags
			text = text.replace(/&lt;(\/)?mark&gt;/gi, "<$1mark>");//Allow <mark> tags
		return text;
	}

	public get classes():string[] {
		let res = ["chatnotice"];
		if(this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.COMMERCIAL_ERROR) res.push("alert");
		if(this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE) {
			res.push("shield");
			if((this.messageData as TwitchatDataTypes.MessageShieldMode).enabled) {
				res.push("enabled");
			}
		}
		if(this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE) {
			res.push("emergency");
			if((this.messageData as TwitchatDataTypes.MessageEmergencyModeInfo).enabled) {
				res.push("enabled");
			}
		}
		return res;
	}

	public mounted():void {
		switch(this.messageData.noticeId) {
			case TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE:		this.icon = "shield"; break;
			case TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE:	this.icon = "emergency"; break;
		}
		this.$store("accessibility").setAriaPolite(this.message);
	}
}
</script>

<style scoped lang="less">
.chatnotice{
	.chatMessage();

	.message {
		font-style: italic;
		opacity: .7;
		color: @mainColor_warn;

		:deep(mark) {
			margin: 0 .2em;
			color: lighten(@mainColor_warn, 15%);
		}
	}

	&.emergency, &.shield {
		padding: .5em;
		border-radius: .5em;
		background-color: rgba(255, 255, 255, .15);
		&:hover {
			background-color: rgba(255, 255, 255, .25);
		}
		&.enabled {
			background-color: @mainColor_alert;
			&:hover {
				background-color: @mainColor_alert_light;
			}
		}
		.message {
			color: @mainColor_light;
			opacity: 1;
			:deep(mark) {
				color: inherit;
			}
		}
	}

	&.alert {
		.message {
			color: @mainColor_alert;
			:deep(mark) {
				color: lighten(@mainColor_alert, 10%);
			}
		}
	}
}
</style>