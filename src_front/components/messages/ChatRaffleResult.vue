<template>
	<div class="chatraffleresult">
		<span class="time" v-if="sParams.appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/ticket.svg" alt="icon" class="icon">
		
		<i18n-t scope="global" tag="div" keypath="chat.raffle.title">
			<template #USER v-if="user">
				<a class="userlink" @click.stop="openUserCard(user!)">{{user!.displayName}}</a>
			</template>
			<template #USER v-else><strong>{{messageData.winner.label}}</strong></template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import { storeParams } from '@/store/params/storeParams';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{},
	emits:["onRead"]
})
export default class ChatRaffleResult extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageRaffleData;
	public sParams = storeParams();
	
	public get user():TwitchatDataTypes.TwitchatUser|null {
		const w = this.messageData.winner;
		if(!w.user) return null;
		const user = this.$store("users").getUserFrom(w.user.platform, w.user.channel_id, w.user.id);

		return user;
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user, this.messageData.winner.user?.channel_id);
	}
}
</script>

<style scoped lang="less">
.chatraffleresult{
	.chatMessageHighlight();
}
</style>