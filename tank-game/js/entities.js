(function(){
  var T=window.TankGame=window.TankGame||{};
  T.Tank=function(x,y,color,options){options=options||{};this.x=x;this.y=y;this.color=color;this.type=options.type||'player';this.r=options.radius||14;this.cool=0;this.maxHealth=options.health||100;this.health=this.maxHealth;this.shotInterval=options.cooldown||.45;this.damage=options.damage||0;this.speed=options.speed||190;this.angle=-Math.PI/2;this.muzzle=0;this.hitFlash=0};
  T.Tank.prototype.draw=function(ctx,angle){
    var a=angle===undefined?this.angle:angle;
    ctx.save();ctx.translate(this.x,this.y);ctx.rotate(a);
    if(this.type==='boss')ctx.scale(1.42,1.42);
    // 阴影与双履带：采用原创俯视角轮廓，和战场视角保持一致
    ctx.fillStyle='rgba(0,0,0,.34)';ctx.fillRect(-19,-16,38,32);
    ctx.fillStyle='#1c2b32';ctx.fillRect(-18,-15,36,7);ctx.fillRect(-18,8,36,7);
    ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=1;ctx.strokeRect(-18,-15,36,7);ctx.strokeRect(-18,8,36,7);
    for(var i=-13;i<=13;i+=7){ctx.fillStyle='rgba(210,235,226,.3)';ctx.fillRect(i,-14,3,5);ctx.fillRect(i,9,3,5)}
    // 装甲车体
    ctx.fillStyle=this.color;ctx.beginPath();ctx.moveTo(-14,-10);ctx.lineTo(9,-10);ctx.lineTo(15,-5);ctx.lineTo(15,5);ctx.lineTo(9,10);ctx.lineTo(-14,10);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.stroke();
    // 炮塔、炮管
    ctx.fillStyle=this.color;ctx.fillRect(-3,-7,14,14);ctx.strokeStyle='rgba(255,255,255,.45)';ctx.strokeRect(-3,-7,14,14);
    ctx.fillStyle='#dcefe7';ctx.fillRect(5,-2,23,4);
    if(this.type==='heavy'){ctx.strokeStyle='rgba(255,230,160,.7)';ctx.lineWidth=2;ctx.strokeRect(-7,-11,22,22)}
    if(this.type==='boss'){ctx.strokeStyle='rgba(215,255,138,.9)';ctx.lineWidth=2;ctx.strokeRect(-11,-14,29,28);ctx.strokeStyle='rgba(182,140,255,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(3,0,13,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#f0e8ff';ctx.beginPath();ctx.arc(3,0,4,0,Math.PI*2);ctx.fill()}
    if(this.type==='scout'){ctx.fillStyle='rgba(255,255,255,.45)';ctx.beginPath();ctx.arc(4,0,3,0,Math.PI*2);ctx.fill()}
    ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(-11,-8,12,2);ctx.fillRect(-11,6,12,2);
    if(this.muzzle>0){ctx.fillStyle='rgba(255,231,154,.95)';ctx.shadowColor='#ffe79a';ctx.shadowBlur=16;ctx.beginPath();ctx.arc(30,0,7,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
    if(this.hitFlash>0){ctx.fillStyle='rgba(255,255,255,.55)';ctx.fillRect(-14,-10,28,20)}
    if(this.type!=='player'&&this.health<this.maxHealth){ctx.rotate(-a);var barWidth=this.type==='boss'?58:40;var barLeft=-barWidth/2;ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(barLeft,-25,barWidth,4);ctx.fillStyle=this.type==='boss'?'#b68cff':'#d7ff8a';ctx.fillRect(barLeft,-25,barWidth*Math.max(0,this.health/this.maxHealth),4)}
    ctx.restore();
  };
  T.Bullet=function(x,y,vx,vy,owner){this.x=x;this.y=y;this.prevX=x;this.prevY=y;this.vx=vx;this.vy=vy;this.owner=owner;this.life=1.5};
})();
