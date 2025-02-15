
<template>
	<div :class="classes" :style="styles">
		
		<div class="content" v-if="trainData.state == 'APPROACHING'">
			<img src="@/assets/icons/train.svg" alt="train" class="icon" v-if="!boostMode">
			<img src="@/assets/icons/train_boost.svg" alt="boost" class="icon" v-if="boostMode">
			<h1 v-if="!boostMode">{{ $t("train.hype_approaching") }}</h1>
			<h1 v-else>{{ $t("train.boost_approaching") }}</h1>
		</div>
		
		<div class="content" v-if="trainProgress">
			<img src="@/assets/icons/train.svg" alt="train" class="icon" v-if="!boostMode">
			<img src="@/assets/icons/train_boost.svg" alt="boost" class="icon" v-if="boostMode">
			<i18n-t scope="global" tag="h1"
			:keypath="boostMode?'train.boost_progress':'train.hype_progress'">
				<template #LEVEL>{{ trainData.level }}</template>
				<template #PERCENT><span class="percent">{{roundProgressPercent}}%</span></template>
			</i18n-t>
		</div>
		
		<div class="content" v-if="trainData.state == 'COMPLETED'">
			<img src="@/assets/icons/train.svg" alt="train" class="icon" v-if="!boostMode">
			<img src="@/assets/icons/train_boost.svg" alt="boost" class="icon" v-if="boostMode">
			<h1>
				<span v-if="!boostMode">{{ $t("train.hype_complete") }}</span>
				<span v-else>{{ $t("train.boost_complete") }}</span>
				<br />
				<i18n-t scope="global" tag="span" class="subtitle"
				keypath="train.hype_complete_details">
					<template #LEVEL><strong>{{completeLevel}}</strong></template>
				</i18n-t>
			</h1>
		</div>
		
		<div class="content" v-if="trainData.state == 'EXPIRE'">
			<img src="@/assets/icons/train.svg" alt="train" class="icon" v-if="!boostMode">
			<img src="@/assets/icons/train_boost.svg" alt="boost" class="icon" v-if="boostMode">
			<h1 v-if="!boostMode">{{ $t("train.boost_cancel") }}</h1>
			<h1 v-else>{{ $t("train.boost_cancel") }}</h1>
		</div>

		<ProgressBar v-if="(trainProgress || trainData.state == 'APPROACHING') && trainData.state != 'COMPLETED'"
			class="progressBar"
			:duration="timerDuration"
			:percent="timerPercent"
			:green="boostMode"
		/>

		<div class="content conductors">
			<div v-if="conductor_subs" class="conductor" ref="conductor_subs_holder" :data-tooltip="$t('train.conductor_subs_tt')">
				<div class="head">
					<div class="icon"><img src="@/assets/icons/sub_purple.svg"></div>
				</div>

				<img :src="conductor_subs.user.avatarPath" class="avatar">

				<a class="userlink" @click.stop="openUserCard(conductor_subs!.user)">{{conductor_subs.user.displayName}}</a>

				<i18n-t scope="global" tag="div" class="label" keypath="train.conductor_subs" :plural="getConductorSubCount()">
					<template #COUNT>
						<span class="count">{{ getConductorSubCount() }}</span>
					</template>
				</i18n-t>
			</div>

			<div v-if="conductor_bits" class="conductor" ref="conductor_bits_holder" :data-tooltip="$t('train.conductor_bits_tt')">
				<div class="head">
					<div class="icon"><img src="@/assets/icons/bits_purple.svg"></div>
				</div>

				<img :src="conductor_bits.user.avatarPath" class="avatar">

				<a class="userlink" @click.stop="openUserCard(conductor_bits!.user)">{{conductor_bits.user.displayName}}</a>
				
				<i18n-t scope="global" tag="div" class="label" keypath="train.conductor_bits" :plural="getConductorBitsCount()">
					<template #COUNT>
						<span class="count">{{ getConductorBitsCount() }}</span>
					</template>
				</i18n-t>
			</div>
			
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import type { StyleValue } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import ProgressBar from '../ProgressBar.vue';

@Component({
	components:{
		ProgressBar,
	}
})
export default class HypeTrainState extends Vue {

	public timerPercent:number = 0;
	public timerDuration:number = 0;
	public progressPercent:number = 0;
	public conductor_subs:TwitchatDataTypes.HypeTrainConductorData | null = null;
	public conductor_bits:TwitchatDataTypes.HypeTrainConductorData | null = null;

	private disposed:boolean = false;

	public get boostMode():boolean {
		return this.trainData.is_boost_train;
	}

	public get completeLevel():number {
		let level = this.trainData.level;
		if(this.progressPercent < 100) level --;
		return level;
	}

	public get trainProgress():boolean {
		return this.trainData.state == 'START' || this.trainData.state == 'PROGRESSING' || this.trainData.state == 'LEVEL_UP';
	}

	public get trainData():TwitchatDataTypes.HypeTrainStateData {
		//This view can't exist if no hype train isn't started, it's safe to force "!"
		return this.$store("stream").hypeTrain!;
	}

	public get duration():string {
		return Utils.formatDuration(this.trainData.timeLeft_s * (1-this.timerPercent) * 1000);
	}

	public get roundProgressPercent():number {
		return Math.round(this.progressPercent);
	}

	public get styles():StyleValue {
		if(this.trainProgress) {
			return {
				backgroundSize: this.progressPercent+" 100%",
			}
		}
		return {};
	}

	public get classes():string[] {
		const res = ["hypetrainstate"];
		if(this.boostMode) res.push("boost");
		return res;
	}

	public getConductorSubCount():number {
		let count = 0;
		for (let i = 0; i < this.conductor_subs!.contributions.length; i++) {
			const c = this.conductor_subs!.contributions[i];
			if(c.sub_t1) count += c.sub_t1;
			if(c.sub_t2) count += c.sub_t2;
			if(c.sub_t3) count += c.sub_t3;
			if(c.subgift_t1) count += c.subgift_t1;
			if(c.subgift_t2) count += c.subgift_t2;
			if(c.subgift_t3) count += c.subgift_t3;
		}
		return count;
	}

	public getConductorBitsCount():number {
		let count = 0;
		for (let i = 0; i < this.conductor_bits!.contributions.length; i++) {
			const c = this.conductor_bits!.contributions[i];
			if(c.bits) count += c.bits;
		}
		return count;
	}

	public mounted():void {
		this.dataChange();
		watch(()=>this.$store("stream").hypeTrain, ()=>this.dataChange());

		if(this.trainData.conductor_subs) {
			this.conductor_subs = this.trainData.conductor_subs;
		}
		if(this.trainData.conductor_bits) {
			this.conductor_bits = this.trainData.conductor_bits;
		}

		watch(() => this.trainData, () => {
			if(!this.trainData) return;
			
			try {
				if(this.conductor_subs && this.trainData.conductor_subs && JSON.stringify(this.conductor_subs) == JSON.stringify(this.trainData.conductor_subs)) return;
	
				if(this.conductor_subs) {
					gsap.killTweensOf(this.$refs.conductor_subs_holder as HTMLDivElement);
					gsap.to(this.$refs.conductor_subs_holder as HTMLDivElement, {
						duration:.25,
						scale:0,
						ease:"sine.in",
						onComplete:()=> {
							this.conductor_subs = this.trainData?.conductor_subs ?? null;
							if(!this.conductor_subs) return;
							this.$nextTick().then(()=>{
								gsap.to(this.$refs.conductor_subs_holder as HTMLDivElement, {
									duration:.25,
									scale:1,
									ease:"sine.out",
								});
							});
						}
					});
				}else if(this.trainData.conductor_subs){
					this.conductor_subs = this.trainData.conductor_subs;
				}else {
					this.conductor_subs = null;
				}
			}catch(error){
				console.log(error);
			}
		}, {deep:true});

		watch(() => this.trainData, () => {
			try {
				if(this.conductor_bits && this.trainData.conductor_bits && JSON.stringify(this.conductor_bits) == JSON.stringify(this.trainData.conductor_bits)) return;

				if(this.conductor_bits) {
					gsap.killTweensOf(this.$refs.conductor_bits_holder as HTMLDivElement);
					gsap.to(this.$refs.conductor_bits_holder as HTMLDivElement, {
						duration:.25,
						scale:0,
						ease:"sine.in",
						onComplete:()=> {
							this.conductor_bits = this.trainData?.conductor_bits ?? null;
							if(!this.conductor_bits) return;
							this.$nextTick().then(()=>{
								gsap.to(this.$refs.conductor_bits_holder as HTMLDivElement, {
									duration:.25,
									scale:1,
									ease:"sine.out",
								});
							});
						}
					});
				}else if(this.trainData.conductor_bits){
					this.conductor_bits = this.trainData.conductor_bits;
				}else {
					this.conductor_bits = null;
				}
			}catch(error){
				console.log(error);
			}
		}, {deep:true});

		this.renderFrame();
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	public dataChange():void {
		gsap.killTweensOf(this);

		this.timerDuration = this.trainData.state == "APPROACHING"? this.trainData.timeLeft_s * 1000 : 5*60*1000;

		const p = Math.round(this.trainData.currentValue/this.trainData.goal * 100);
		gsap.to(this, {progressPercent:p, ease:"sine.inOut", duration:.5});
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user, this.trainData.channel_id);
	}

	private renderFrame():void {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());
		const ellapsed = Date.now() - this.trainData.updated_at;
		const duration = this.trainData.timeLeft_s * 1000;
		this.timerPercent = 1 - (duration-ellapsed)/this.timerDuration;
	}

}
</script>

<style scoped lang="less">
.hypetrainstate{

	&.boost {
		@c: darken(#00f0f0, 15%);
		background-color: @c !important;
	}

	.progressBar {
		margin: 10px 0;
		color: @windowStateColor;
	}

	.content {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;
		color: @mainColor_light;

		h1 {
			text-align: center;
			.subtitle {
				font-size: .9em;
				font-weight: normal;
			}
		}
		
		&>.icon {
			height: 25px;
			margin-right: 10px;
		}

		.duration {
			// font-size: .8em;
			margin-left: 15px;
		}

		:deep(.percent) {
			font-family: var(--font-azeret);
			font-size: .7em;
			vertical-align: middle;
			margin-left: 15px;
			background-color: fade(@mainColor_light, 25%);
			padding: 5px;
			border-radius: 5px;
		}

		&.conductors {
			margin-top: .5em;
			display: flex;
			flex-direction: row;
			gap: 1em;
			font-size: .8em;
			
			.conductor {
				display: flex;
				align-items: center;
				flex-direction: column;
				gap:.25em;
				background-color: @mainColor_light;
				border-radius: @border_radius;
				padding: .5em;
				min-width: 6em;
				
				.head {
					position: absolute;
					display: flex;
					flex-direction: column;
					align-self: flex-start;
					margin-top: -.8em;
					margin-left: -.8em;
					.icon {
						display: inline;
						background-color: @mainColor_light;
						padding: .25em;
						border-radius: 50%;
						img {
							object-fit: contain;
							width: 1em;
							height: 1em;
						}
					}
				}
				.avatar {
					width: 3em;
					height: 3em;
					border-radius: 50%;
					margin: auto;
					display: block;
					border: 1px solid @mainColor_normal;
				}
				.userlink {
					font-size: .9em;
				}
				.label {
					color: @mainColor_normal;
					.count {
						font-weight: bold;
					}
				}
			}
		}
	}
}
</style>