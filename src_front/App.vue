<template>
	<div :class="classes" :style="styles">
		<router-view />
		<Confirm />
		<Alert />
		<Tooltip />
	</div>
</template>

<script lang="ts">
import { watch, type StyleValue } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import DataStore from './store/DataStore';
import Alert from "./views/AlertView.vue";
import Confirm from "./views/Confirm.vue";
import Tooltip from "./views/Tooltip.vue";

@Component({
	components:{
		Alert,
		Confirm,
		Tooltip,
	}
})
export default class App extends Vue {

	public scale:number = 1.25;
	
	public defaultScale:number = 1.25;
	private resizeHandler!:() => void;
	private keyDownHandler!:(e:KeyboardEvent) => void;

	public get dyslexicFont():boolean { return this.$store("params").appearance.dyslexicFont.value as boolean; }

	public get classes():string[] {
		let res = ["app"];
		if(this.dyslexicFont === true) res.push("dyslexicFont");
		if(this.$route.meta.overflow === true) res.push("overflow");
		res.push("messageSize_"+this.$store("params").appearance.defaultSize.value);
		return res;
	}

	public get styles():StyleValue {
		let res:StyleValue = {};
		if(this.scale != 1 && !isNaN(this.scale)) {
			res.fontSize = Math.min(2.95, Math.max(.95, this.scale))+"em";
		}
		return res;
	}

	public mounted():void {
		const scale = DataStore.get(DataStore.INTERFACE_SCALE);
		if(scale) {
			this.scale = parseFloat(scale);
			if(isNaN(this.scale)) this.scale = 1;
		}
		this.resizeHandler = ()=> this.onWindowResize();
		this.keyDownHandler = (e)=> this.onKeyDown(e);
		window.addEventListener("resize", this.resizeHandler);
		window.addEventListener("keydown", this.keyDownHandler);
		this.onWindowResize();
		watch(()=> this.$store("main").initComplete, ()=> this.hideMainLoader())
		this.hideMainLoader();
	}
	
	public beforeUnmount():void {
		window.removeEventListener("resize", this.resizeHandler);
		window.removeEventListener("keydown", this.keyDownHandler);
	}

	private onWindowResize():void {
		//vh metric is fucked up on mobile. It doesn't take header/footer UIs into account.
		//Here we calculate the actual page height and set it as a CSS var.
		(document.querySelector(':root') as HTMLHtmlElement).style.setProperty('--vh', window.innerHeight + 'px');
	}

	private onKeyDown(e:KeyboardEvent):void {
		//Allow to zoom interface via "Shift +/-/0" key
		if(!e.shiftKey && e.key !== "Insert") return;
		let scale = this.scale;
		if(e.key === "=" || e.key === "+") scale += .1;
		if(e.key === "6") scale -= .1;
		if(e.key === "0" || e.key === "Insert") scale = this.defaultScale;
		scale = Math.min(2.95, Math.max(.95, scale));
		this.scale = scale;
		DataStore.set(DataStore.INTERFACE_SCALE, scale, false);
	}

	private hideMainLoader():void {
		if(this.$store("main").initComplete === true) {
			//@ts-ignore
			closeInitLoader();//Method declared on index.html
		}
	}
}
</script>

<style scoped lang="less">
.app{
	width: 100%;
	height: var(--vh);
	font-size: 1.25em;
	font-family: var(--font-inter);
	overflow: hidden;

	&.dyslexicFont {
		font-size: 1.1em !important;
		--font-inter: "OpenDyslexic";
		--font-nunito: "OpenDyslexic";
		--font-roboto: "OpenDyslexic";
		--font-azeret: "OpenDyslexic";
	}
	
	&.overflow {
		overflow: auto;
	}

	&.messageSize_1 {
		--messageSize: .4em;
	}
	&.messageSize_2 {
		--messageSize: .5em;
	}
	&.messageSize_3 {
		--messageSize: .6em;
	}
	&.messageSize_4 {
		--messageSize: .7em;
	}
	&.messageSize_5 {
		--messageSize: .8em;
	}
	&.messageSize_6 {
		--messageSize: .9em;
	}
	&.messageSize_7 {
		--messageSize: 1em;
	}
	&.messageSize_8 {
		--messageSize: 1.1em;
	}
	&.messageSize_9 {
		--messageSize: 1.2em;
	}
	&.messageSize_10 {
		--messageSize: 1.3em;
	}
	&.messageSize_11 {
		--messageSize: 1.4em;
	}
	&.messageSize_12 {
		--messageSize: 1.5em;
	}
	&.messageSize_13 {
		--messageSize: 1.6em;
	}
	&.messageSize_14 {
		--messageSize: 1.7em;
	}
	&.messageSize_15 {
		--messageSize: 1.8em;
	}
	&.messageSize_16 {
		--messageSize: 1.9em;
	}
	&.messageSize_17 {
		--messageSize: 2em;
	}
	&.messageSize_18 {
		--messageSize: 2.1em;
	}
	&.messageSize_19 {
		--messageSize: 2.2em;
	}
	&.messageSize_20 {
		--messageSize: 2.3em;
	}
}
@media only screen and (max-width: 500px) {
	.app{
		font-size: 18px;
	}
}
</style>