<template>
	<div class="chatbits">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img src="@/assets/icons/bits.svg" alt="bits" class="icon">

		<div class="holder">
			<i18n-t scope="global" tag="span" keypath="chat.bits" :plural="messageData.bits">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard()">{{messageData.user.displayName}}</a>
				</template>
				<template #BITS>
					<strong>{{ messageData.bits }}</strong>
				</template>
			</i18n-t>
	
			<div class="quote" v-if="messageText" v-html="messageText"></div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{},
	emits:["onRead"],
})
export default class ChatBits extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageCheerData;

	public messageText:string = "";

	public mounted():void {
		this.messageText = this.messageData.message_html ?? this.messageData.message ?? "";
		const reason = this.$tc("chat.bits", {COUNT:this.messageData.bits, USER:this.messageData.user.displayName});
		this.$store("accessibility").setAriaPolite(reason+" "+this.messageData.message);
	}

	public openUserCard():void {
		this.$store("users").openUserCard(this.messageData.user, this.messageData.channel_id);
	}

}
</script>

<style scoped lang="less">
.chatbits{
	.chatMessageHighlight();
}
</style>