<template>
	<form @submit.prevent="connect()" class="obsconnectform">
		<transition name="fade">
			<div v-if="connectSuccess && connected" @click="connectSuccess = false" class="success">{{ $t("obs.connection_success") }}</div>
		</transition>
		<ParamItem :paramData="obsPort_conf" class="row" v-if="!connected" />
		<ParamItem :paramData="obsPass_conf" class="row" v-if="!connected" />
		<ParamItem :paramData="obsIP_conf" class="row" v-if="!connected" />
		
		<ToggleBlock class="info" small :open="false" :title="$t('obs.how_to_title')" v-if="!connected">
			<p>{{ $t("obs.how_to1") }}</p>
			<i18n-t scope="global" tag="p" class="warn" keypath="obs.how_to2">
				<template #IP><strong>127.0.0.1</strong></template>
			</i18n-t>
			<img src="@/assets/img/obs-ws_credentials.png" alt="credentials">
		</ToggleBlock>

		<Button :title="$t('global.connect')" type="submit" class="connectBt" v-if="!connected" :loading="loading" />
		<Button :title="$t('global.disconnect')" @click="disconnect()" class="connectBt" v-if="connected" :loading="loading" :icon="$image('icons/cross_white.svg')" />

		<transition name="fade">
			<div v-if="connectError" @click="connectError = false" class="error">
				<div>{{ $t("error.obs_ws_connect") }}</div>
				<div v-if="obsIP_conf.value != '127.0.0.1'">{{ $t("obs.ip_advice") }}</div>
			</div>
		</transition>
	</form>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import Button from '../../../Button.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{
		Button,
		ParamItem,
		ToggleBlock,
	},
	emits:[],
})
export default class OBSConnectForm extends Vue {

	public loading:boolean = false;
	public connected:boolean = false;
	public connectError:boolean = false;
	public connectSuccess:boolean = false;
	public obsPort_conf:TwitchatDataTypes.ParameterData	= { type:"number", value:4455, min:0, max:65535, step:1 };
	public obsPass_conf:TwitchatDataTypes.ParameterData	= { type:"password", value:"", };
	public obsIP_conf:TwitchatDataTypes.ParameterData	= { type:"string", value:"127.0.0.1", };

	public get obswsInstaller():string { return Config.instance.OBS_WEBSOCKET_INSTALLER; }

	beforeMount(): void {
		this.obsPort_conf.labelKey	= "obs.form_port";
		this.obsPass_conf.labelKey	= "obs.form_pass";
		this.obsIP_conf.labelKey	= "obs.form_ip";
	}

	public mounted():void {
		const port = DataStore.get("obsPort");
		const pass = DataStore.get("obsPass");
		const ip = DataStore.get("obsIP");
		if(port) this.obsPort_conf.value = parseInt(port);
		if(pass) this.obsPass_conf.value = pass;
		if(ip) this.obsIP_conf.value = ip;

		if(port && pass) {
			this.connected = OBSWebsocket.instance.connected;
		}

		watch(()=> this.obsPort_conf.value, () => { this.paramUpdate(); })
		watch(()=> this.obsPass_conf.value, () => { this.paramUpdate(); })
		watch(()=> this.obsIP_conf.value, () => { this.paramUpdate(); })
		watch(()=> OBSWebsocket.instance.connected, () => { 
			this.connected = OBSWebsocket.instance.connected;
		});
	}

	/**
	 * Connect to OBS websocket
	 */
	public async connect():Promise<void> {
		this.loading = true;
		this.connectSuccess = false;
		this.connectError = false;
		const connected = await OBSWebsocket.instance.connect(
							(this.obsPort_conf.value as number).toString(),
							this.obsPass_conf.value as string,
							false,
							this.obsIP_conf.value as string,
							true
						);
		if(connected) {
			this.paramUpdate();
			this.connected = true;
			this.connectSuccess = true;
			setTimeout(()=> {
				this.connectSuccess = false;
			}, 3000);
		}else{
			this.connectError = true;
		}
		this.loading = false;
	}

	public async disconnect():Promise<void> {
		OBSWebsocket.instance.disconnect();
	}

	/**
	 * Called when changing OBS credentials
	 */
	private paramUpdate():void {
		this.connected = false;
		DataStore.set("obsPort", this.obsPort_conf.value);
		DataStore.set("obsPass", this.obsPass_conf.value);
		DataStore.set("obsIP", this.obsIP_conf.value);
	}

}
</script>

<style scoped lang="less">
.obsconnectform{

	display: flex;
	flex-direction: column;
	
	.info {
		margin-bottom: 1em;
	}

	.connectBt {
		display: block;
		margin: auto;
	}

	.error, .success {
		justify-self: center;
		color: @mainColor_light;
		display: block;
		text-align: center;
		padding: 5px;
		border-radius: 5px;
		margin: auto;
		margin-top: 10px;
		font-size: .9em;

		&.error {
			background-color: @mainColor_alert;
		}

		&.success {
			background-color: #1c941c;
			margin-top: 0px;
			margin-bottom: 10px;
		}
		
		a {
			color: @mainColor_light;
		}

		div:not(:last-child) {
			margin-bottom: 1em;
		}
		:deep(strong) {
			background-color: @mainColor_light;
			color: @mainColor_alert;
			padding: 0 0.25em;
			border-radius: 0.25em;
		}
	}
	.warn {
		margin-top: 1em;
		font-style: italic;
	}

	.fade-enter-active {
		transition: all 0.2s;
	}

	.fade-leave-active {
		transition: all 0.2s;
	}

	.fade-enter-from,
	.fade-leave-to {
		opacity: 0;
		transform: translateY(-10px);
	}

	:deep(input) {
		min-width: 100px;
		//These lines seems stupide AF but they allow the input
		//to autosize to it's min length
		width: 0%;
		flex-grow: 1;
		max-width: 100px;

		text-align: center;
		
		//Hide +/- arrows
		&::-webkit-outer-spin-button,
		&::-webkit-inner-spin-button {
			display: none;
		}
	}
}
</style>