<template>
	<div class="paramsconnexions">
		<ToggleBlock class="item" :open="false" title="OBS websocket" :icons="['obs_purple']">
			<OBSConnectForm />
		</ToggleBlock>

		<ConnectSpotifyForm class="item" />
		
		<ConnectWebsocket class="item" />
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import { Component, Vue } from 'vue-facing-decorator';
import ConnectSpotifyForm from './connexions/ConnectSpotifyForm.vue';
import ConnectWebsocket from './connexions/ConnectWebsocket.vue';
import OBSConnectForm from './obs/OBSConnectForm.vue';

@Component({
	components:{
		ToggleBlock,
		OBSConnectForm,
		ConnectWebsocket,
		ConnectSpotifyForm,
	},
	emits:["setContent"],
})
export default class ParamsConnexions extends Vue {

}
</script>

<style scoped lang="less">
.paramsconnexions{
	.item {
		margin-bottom: 1em;
	}
}
</style>