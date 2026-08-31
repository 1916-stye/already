(function(){
  var T=window.TankGame=window.TankGame||{};
  T.Input=function(canvas){
    this.keys={};
    this.fire=false;
    this.pointer={x:480,y:270};
    this.pointerMoved=false;
    this.aimVector={x:0,y:-1};
    this.aimActive=false;
    this.aimMode='pointer';
    this.aimPad=document.getElementById('aimPad');
    this.aimKnob=this.aimPad?this.aimPad.querySelector('.aim-knob'):null;
    this.aimPointerId=null;
    window.addEventListener('keydown',function(e){
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','Space','Escape'].indexOf(e.code)>=0){
        e.preventDefault();
        this.keys[e.code]=true;
        if(e.code==='Space'&&!e.repeat)this.fire=true;
      }
    }.bind(this));
    window.addEventListener('keyup',function(e){this.keys[e.code]=false}.bind(this));
    var updatePointer=function(e){
      var r=canvas.getBoundingClientRect();
      this.pointer.x=(e.clientX-r.left)*960/r.width;
      this.pointer.y=(e.clientY-r.top)*540/r.height;
      this.pointerMoved=true;
      this.aimActive=true;
      this.aimMode='pointer';
    }.bind(this);
    canvas.addEventListener('pointermove',updatePointer);
    canvas.addEventListener('pointerdown',function(e){updatePointer(e);this.fire=true}.bind(this));
    if(this.aimPad){
      this.aimPad.addEventListener('pointerdown',function(e){
        e.preventDefault();
        this.aimPointerId=e.pointerId;
        this.aimPad.setPointerCapture(e.pointerId);
        this.aimActive=true;
        this.aimMode='stick';
        this.updateAimStick(e.clientX,e.clientY);
      }.bind(this));
      this.aimPad.addEventListener('pointermove',function(e){
        if(e.pointerId===this.aimPointerId){e.preventDefault();this.updateAimStick(e.clientX,e.clientY)}
      }.bind(this));
      ['pointerup','pointercancel','lostpointercapture'].forEach(function(name){
        this.aimPad.addEventListener(name,function(e){
          if(this.aimPointerId===null||e.pointerId===this.aimPointerId){this.aimPointerId=null;this.resetAimStick()}
        }.bind(this));
      }.bind(this));
      this.aimPad.addEventListener('keydown',function(e){
        var v={x:0,y:0};
        if(e.key==='ArrowLeft')v.x=-1;if(e.key==='ArrowRight')v.x=1;if(e.key==='ArrowUp')v.y=-1;if(e.key==='ArrowDown')v.y=1;
        if(v.x||v.y){e.preventDefault();this.aimVector=v;this.aimActive=true;this.aimMode='stick';this.updateAimKnob(v.x*30,v.y*30)}
      }.bind(this));
    }
  };
  T.Input.prototype.updateAimStick=function(clientX,clientY){
    var r=this.aimPad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    var dx=clientX-cx,dy=clientY-cy,max=Math.max(1,r.width*.34),len=Math.hypot(dx,dy)||1;
    if(len>max){dx=dx/len*max;dy=dy/len*max}
    var n=Math.hypot(dx,dy)||1;
    this.aimVector={x:dx/n,y:dy/n};
    this.aimActive=true;this.aimMode='stick';this.pointerMoved=true;
    this.updateAimKnob(dx,dy);
  };
  T.Input.prototype.updateAimKnob=function(x,y){if(this.aimKnob){this.aimKnob.style.transform='translate(calc(-50% + '+x+'px),calc(-50% + '+y+'px))'}};
  T.Input.prototype.resetAimStick=function(){this.updateAimKnob(0,0);this.aimActive=false};
  T.Input.prototype.move=function(){
    var k=this.keys;
    return {x:(k.ArrowRight||k.KeyD?1:0)-(k.ArrowLeft||k.KeyA?1:0),y:(k.ArrowDown||k.KeyS?1:0)-(k.ArrowUp||k.KeyW?1:0)}
  };
})();
