/**
===================================================================
DisplayObject Class
===================================================================
**/

const _graphics=Symbol("graphics");

class DisplayObject extends DisplayBase
{
	constructor()
	{
		super();
		
		this.use_canvas=true;
		this._repeat=false;
		this._mask=null;
	
		this.name=UniqueUtil.getName("display_object");
		this.colorTransform=null;
		this[_graphics]=null;
		this.blendMode=null;
		this._context=null;
		this.polyArea=null;
		this._cache=null;
		this.canvas=null;
		this.filters=[];
	}
	
	set cache(bool)
	{
		if(!bool && !this._cache) return;
		this.canvas=null;
		
		if(!bool){
			ObjectPool.remove(this._cache);
			this._cache=null;
			return;
		}
		
		if(bool && bool instanceof RenderObject){
			if(this._cache) ObjectPool.remove(this._cache);
			
			this._cache=bool;
			this.canvas=this._cache.canvas;
			return;
		}
		
		if(!this._cache) {
			this._cache=RenderObject.instance;
			if(!this._cache) return;
		}
		else this._cache.clear();
		
		this._cache.setSize(this.width,this.height);
		this._render(this._cache,true);
		this.canvas=this._cache.canvas;
	}
	
	get mask()
	{
		return this._mask;
	}
	
	set mask(value) 
	{
		if(!value || !(value instanceof ShapeVO) || !this.instance){
			this._mask=null;
			return;
		}
		
		this._mask=value;
		this.__checkDisplayUpdate();
    }
	
	get graphics()
	{
		this[_graphics] =(!this[_graphics] ? ObjectPool.create(GraphicsVO) : this[_graphics]);
		return this[_graphics];
	}
	
	set graphics(value) 
	{
        this[_graphics] =(value && !(value instanceof GraphicsVO) ? null : value);
    }
	
	get context()
	{
		this._context=(!this._context ? ObjectPool.create(ContextVO) : this._context)
		return this._context;
	}
	
	set context(value)
	{
		this._context=value;
	}
	
	/**
	 * repeat display
	 * @param {Number} w
	 * @param {Number} h
	 * @param {String} t repeat|repeat-x|repeat-y|no-repeat
	 */
	repeat(w,h,t)
	{
		if(this.instance==undefined || t=="no-repeat" || (w<=this.instance.width && h<=this.instance.height)){
			this._repeat=false;
			return;
		}
		
		t = t || "repeat";
		
		this.width=w;
		this.height=h;
		this._repeat=true;
		
		this.graphics.reset();
		this.graphics.beginBitmapFill(this.instance.image,t);
		this.graphics.drawRect(0,0,this.width,this.height);
		this.graphics.endFill();
	}
	
	_transform (target,obj)
	{
		let _temp_context=(obj==undefined ? this.stage.context : obj.context);
		let mtx=this.getMatrix(target,true);
	    _temp_context.transform(mtx.a, mtx.b, mtx.c, mtx.d, mtx.tx, mtx.ty);
		_temp_context.globalAlpha*=this.alpha*this._parent_alpha;
	}
	
	setInstance(target)
	{
		if(target && (target instanceof Source) && !target.image) target=null;
		
		if(this.instance!=target){
			if(this.instance && (this.instance instanceof Source) && this.instance.isClone){
				ObjectPool.remove(this.instance);
			}
			this.instance=null;
			this.width=this.height=0;
		}
		
		if(target==undefined || target==null || this.instance==target) return target;
		
		if(target instanceof Image || ClassUtil.getQualifiedClassName(target)=="HTMLImageElement"){
			let temp=target;
			target=ObjectPool.create(Source);
			target.image=temp;
			target.isClone=true;
			target.width=temp.width;
			target.height=temp.height;
		}
		
		if(this.instance && (this.instance instanceof Source) && this.instance.isClone){
			ObjectPool.remove(this.instance);
		}
		
		this.instance=target;
		if(!StringUtil.isEmpty(target.name)) this.name=target.name;
		
		if(!this.register_point) this.register_point=ObjectPool.create(Point);
		this.register_point.set(target.regX,target.regY);
		
		this.width=this.instance.width;
		this.height=this.instance.height;

		this.updateMatrix=true;
		this.__checkDisplayUpdate();
		this.dispatchEvent(Factory.c("ev",[DisplayBase.RESET_INSTANCE]));
		return this.instance;
	}
	
	do_actions(target,vo,bool=false)
	{
		if(!target || !target.context || !vo) return;
		const canvas=(bool ? target : target.context);
		const params=vo.getValue();
		let action;
		
		if(params){
			for(let i in params) {
				if(canvas[i]==params[i]) continue;
				canvas[i]=params[i];
			}
		}
		
		for(action of vo.actions)
		{
			canvas[action.method].apply(canvas,action.data);
		}
	}
	
	/**
	 * 刷新呈现
	 * @param {CanvasRenderingContext2D} context
	 * @param {Boolean} initial
	 * @param {DisplayObjectContainer} upper
	 */
	_render (target=null,initial=false,upper=null)
	{
		if (!this.visible || this.alpha <= 0 || (!target && !this.stage))  return;
		if (target==undefined) this.stage.context.save();
		if(!initial) this._transform(upper,target);
		
		if(this._mask){
			(target ? target : this.stage.graphics).drawShape(this._mask);
			(target ? target.context : this.stage.context).clip();
		}
		
		if(target==undefined){
			this.stage.context.globalCompositeOperation=this.blendMode;
		}
		
		if(this.filters && this.filters.length>0){
			let filter;
			for (filter of this.filters)
			{
				if(filter==undefined) continue;
				filter.show(target!=undefined ? target.context : this.stage.context);
			}
		}
		
		if(this.canvas){
			(target!=undefined ? target.context : this.stage.context).drawImage(this.canvas,0,0);
		}
		else if(this[_graphics]){
			this.do_actions(target ? target : this.stage.graphics,this.graphics,true);
		}
		else if(this.instance){
			(target!=undefined ? target.context : this.stage.context).drawImage(
				                 this.instance.image,
		                         this.instance.x,
		                         this.instance.y,
		                         this.instance.width,
		                         this.instance.height,
		                         0,0,this.instance.width/this.instance.scale,
		                         this.instance.height/this.instance.scale);
		    
		}
		else if(this.context){
			this.do_actions(target ? target : this.stage,this.context);
		}
		
		if (target==undefined) this.stage.context.restore();
	}
	
	render ()
	{
		this._render.apply(this,arguments);
	}
	
	/**
	 * 碰撞点测试 (注意是全局坐标)
	 * @param {Number} x
	 * @param {Number} y
	 */
	hitTestPoint (x,y) 
	{
		return CollisionUtil.hitTestPoint(this,x,y, this.usePolyCollision)>0 ;
	}
	
	/**
	 * 碰撞测试
	 * @param {displayObject} obj
	 */
	hitTestObject (obj) 
	{
		if(obj==null || !(obj instanceof DisplayBase) ) return false;
		if(obj==this) return true;
		
		return CollisionUtil.hitTestObject(this,obj,this.usePolyCollision);
	}
	
	reset ()
	{	
		super.reset();
		
		if(this._parent){
			this.removeFromParent(false);
		}
		
		if(this.canvas && this.canvas.parentNode) {
			this.canvas.parentNode.removeChild(this.canvas);
		}
		
		if(this.instance && (this.instance instanceof Source) && this.instance.isClone){
			ObjectPool.remove(this.instance);
		}
		
		if(this._mask && this._mask instanceof ShapeVO){
			ObjectPool.remove(this._mask);
		}
		
		if(this[_graphics])  {
	        ObjectPool.remove(this[_graphics]);
		}
		
		if(this.context){
			ObjectPool.remove(this.context);
		}
		
		if(this._cache){
			ObjectPool.remove(this._cache);
		}
		
		this.mask=this.instance=this._cache=this[_graphics]=this.colorTransform=this._context=this.canvas=this.blendMode=null;
		this.use_canvas=true;
		this._repeat=false;
		this.filters=[];
	}
	
	dispose ()
	{
		this.reset();
		super.dispose();
		delete this._repeat,this._cache,this.filters,this._mask,this.instance,this.colorTransform,this.blendMode,this._context,this.canvas;
	}
	
	toString ()
	{
		return DisplayObject.name;
	}
}
