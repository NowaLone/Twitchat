<template>
	<component :is="nodeType" class="infinitelist" @wheel="onWheel($event)">
		<div v-for="(item, index) in items" :key="index" class="list-item"
		:style="getStyles(index)">
			<slot
				:item="item.data"
				:index="index">
			</slot>
		</div>
		
		<div class="scrollbar" ref="scrollbar" v-if="showScrollbar">
			<div class="scrollCursor" ref="cursor" :style="cursorStyles"></div>
		</div>
	</component>
</template>

<script lang="ts">
import type { StyleValue } from 'vue';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:['update:scrollOffset'],
})
export default class InfiniteList extends Vue {

	@Prop({
			type:String,
			default:"div"
		})
	public nodeType!:string;
	@Prop({
			type:Number,
			default:50
		})
	public itemSize!:number;
	@Prop({
			type:Number,
			default:0
		})
	public itemMargin!:number;
	@Prop({
			type:Number,
			default:500
		})
	public listHeight!:number;
	@Prop({
			type:Number,
			default:0
		})
	public scrollOffset!:number;
	@Prop({
			type:Boolean,
			default:false
		})
	public lockScroll!:boolean;
	@Prop({
			type:Boolean,
			default:false
		})
	public noScrollbar!:boolean;
	@Prop({
			type: [Array],
			default: [],
			required: true,
		})
	public dataset!:unknown[];

	public items:IListItem[] = [];
	public scrollOffset_local:number = 0;
	public scrollOffset_local_eased:number = 0;
	public cursorY:number = 0;
	public cursorSize:number = 0;

	private mouseY:number = 0;
	private cursorOffsetY:number = 0;
	private draggingList:boolean = false;
	private draggingListOffset:number = 0;
	private draggingCursor:boolean = false;
	private disposed:boolean = false;
	private trackPressed:boolean = false;
	private dragStartHandler!:(e:MouseEvent|TouchEvent) => void;
	private dragHandler!:(e:MouseEvent|TouchEvent) => void;
	private dragStopHandler!:(e:MouseEvent|TouchEvent) => void;
	private dragStartListHandler!:(e:TouchEvent) => void;

	public getStyles(i:number):(StyleValue | undefined){
		return {
			height: this.itemSize + "px",
			top: this.items[i].py + "px",
		};
	}

	public get cursorStyles():StyleValue {
		return {
			top:this.cursorY+"px",
			height:this.cursorSize+"px",
		}
	}

	public get showScrollbar():boolean { return this.noScrollbar === false; }

	public mounted():void {
		this.scrollOffset_local = this.scrollOffset;
		watch(() => this.scrollOffset, () => {
			if(this.scrollOffset_local_eased === this.scrollOffset) return;//Avoid useless render
			this.scrollOffset_local = this.scrollOffset;
		});
		
		if(this.showScrollbar){
			const scrollbar = this.$refs["scrollbar"] as HTMLDivElement;
			const scrollbarCursor = this.$refs["cursor"] as HTMLDivElement;

			this.dragStartListHandler = (e:TouchEvent) => this.ondragStartList(e);
			this.dragStartHandler = (e:MouseEvent|TouchEvent) => this.onDragStart(e);
			this.dragHandler = (e:MouseEvent|TouchEvent) => this.onDrag(e);
			this.dragStopHandler = (e:MouseEvent|TouchEvent) => this.onDragStop(e);
	
			scrollbar.addEventListener("mousedown", this.dragStartHandler);
			scrollbarCursor.addEventListener("mousedown", this.dragStartHandler);
			scrollbarCursor.addEventListener("touchstart", this.dragStartHandler);
			document.addEventListener("mousemove", this.dragHandler);
			document.addEventListener("touchmove", this.dragHandler);
			document.addEventListener("mouseup", this.dragStopHandler);
			document.addEventListener("touchend", this.dragStopHandler);
			this.$el.addEventListener("touchstart", this.dragStartListHandler);
		}

		requestAnimationFrame(()=>this.renderList());
	}

	public beforeUnmount(): void {
		this.disposed = true;
		if(this.showScrollbar){
			const scrollbar = this.$refs["scrollbar"] as HTMLDivElement;
			const scrollbarCursor = this.$refs["cursor"] as HTMLDivElement;
			
			scrollbar.addEventListener("mousedown", this.dragStartHandler);
			scrollbarCursor.removeEventListener("mousedown", this.dragStartHandler);
			scrollbarCursor.removeEventListener("touchstart", this.dragStartHandler);
			document.removeEventListener("mousemove", this.dragHandler);
			document.removeEventListener("touchmove", this.dragHandler);
			document.removeEventListener("mouseup", this.dragStopHandler);
			document.removeEventListener("touchend", this.dragStopHandler);
			this.$el.removeEventListener("touchstart", this.dragStartListHandler);
		}
	}

	public onWheel(e:WheelEvent):void {
		this.scrollOffset_local += e.deltaY * .5;
		e.preventDefault()
	}


	private onDragStart(e:MouseEvent | TouchEvent):void {
		e.preventDefault();
		this.onDrag(e);
		const scrollbar			= this.$refs["scrollbar"] as HTMLDivElement;
		const scrollbarCursor	= this.$refs["cursor"] as HTMLDivElement;
		const scrollbarCursor_b	= scrollbarCursor.getBoundingClientRect();
		this.cursorOffsetY		= this.mouseY - scrollbarCursor_b.top;
		if(e.target == scrollbar) {
			this.trackPressed	= true;
		}else{
			this.draggingCursor = true;
		}
	}

	private ondragStartList(e:MouseEvent | TouchEvent):void {
		e.preventDefault();
		this.onDrag(e);
		this.draggingList = true;
		this.draggingListOffset = this.mouseY;
	}

	private onDrag(e:MouseEvent | TouchEvent):void {
		if(e.type == "mousemove" || e.type == "mousedown") {
			this.mouseY = (e as MouseEvent).clientY;
		}else{
			this.mouseY = (e as TouchEvent).touches[0].clientY;
		}
	}

	private onDragStop(e:MouseEvent | TouchEvent):void {
		this.draggingCursor	= false;
		this.trackPressed	= false;
		this.draggingList	= false;
	}
	
	private async renderList():Promise<void> {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderList());

		const bounds			= this.$el.getBoundingClientRect();
		const itemsCount		= Math.ceil( bounds.height / (this.itemSize + this.itemMargin) ) + 2;

		this.scrollOffset_local_eased += (this.scrollOffset_local - this.scrollOffset_local_eased) * .1;

		if(itemsCount != this.items.length) {
			const items:IListItem[] = [];
			for (let i = 0; i < itemsCount; i++) {
				items.push({id:i, data:this.dataset[i], py:0});
			}
			this.items = items;
		}

		const maxScrollY = this.dataset.length*(this.itemSize+this.itemMargin) - bounds.height;
		if(this.lockScroll !== false) {
			if(this.scrollOffset_local_eased < 0) {
				this.scrollOffset_local = this.scrollOffset_local_eased = 0;
			}
			if(this.scrollOffset_local_eased > maxScrollY) {
				this.scrollOffset_local = this.scrollOffset_local_eased = maxScrollY;
			}
		}

		const ih = (this.itemSize + this.itemMargin);
		for (let i = 0; i < this.items.length; i++) {
			const len = this.items.length;
			let index:number = (i - this.scrollOffset_local_eased/ih)%len;
			if(index < -1) index += len;
			let py:number = index * ih;
			py -= ih;//offset all from one item to top to avoid a gap when scrolling to top	
			
			let dataIndex:number = Math.round((py+this.scrollOffset_local_eased)/ih);
			dataIndex = dataIndex % this.dataset.length;
			if(dataIndex < 0) dataIndex += this.dataset.length;
			
			this.items[i].py = py;
			this.items[i].data = this.dataset[dataIndex];
		}

		if(this.draggingList) {
			this.scrollOffset_local -= (this.mouseY - this.draggingListOffset)*2;
			this.draggingListOffset = this.mouseY
		}

		if(this.showScrollbar){
			const scrollbar			= this.$refs["scrollbar"] as HTMLDivElement;
			const scrollbar_b		= scrollbar.getBoundingClientRect();
			const scrollbarCursor	= this.$refs["cursor"] as HTMLDivElement;
			const scrollbarCursor_b	= scrollbarCursor.getBoundingClientRect();
			const scrollH = (scrollbar_b.height - scrollbarCursor_b.height);
			if(this.draggingCursor) {
				const py = (this.mouseY - scrollbar_b.top - this.cursorOffsetY) / scrollH;
				// console.log(py);
				this.scrollOffset_local = maxScrollY * py;
			}else if(this.trackPressed) {
				const py = (this.mouseY - scrollbar_b.top - scrollbarCursor_b.height/2) / scrollH;
				// console.log(py);
				this.scrollOffset_local = maxScrollY * py;
			}
			this.cursorY = this.scrollOffset_local_eased / maxScrollY * scrollH;
			this.cursorSize = Math.max(20, bounds.height / (maxScrollY+bounds.height) * scrollbar_b.height);
		}

		if(this.scrollOffset_local_eased != this.scrollOffset) {
			this.$emit("update:scrollOffset", this.scrollOffset_local_eased);
		}


	}

}

interface IListItem {
	id:number;
	data:unknown;
	py:number;
}

</script>

<style scoped lang="less">
.infinitelist{
	@scrollWidth:.5em;
	position: relative;
	.list-item {
		width: calc(100% - @scrollWidth - .25em);
		position: absolute;
	}

	.scrollbar {
		position: absolute;
		top: 0;
		right: 0;
		height: 100%;
		width: @scrollWidth;
		background: fade(@mainColor_dark, 20%);
		border-radius: 1em;
		.scrollCursor {
			position: absolute;
			top:0;
			left:0;
			cursor: pointer;
			width: @scrollWidth;
			background: @mainColor_dark;
			border-radius: 1em;
		}	
	}
}
</style>