(function(){
  var T=window.TankGame=window.TankGame||{},C=T.Config,G=T.Collision;
  T.Game=function(canvas,input){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.input=input;this.map=new T.Map();
    this.state='menu';this.last=0;this.score=0;this.level=1;this.mode='normal';this.sessionLevels=2;this.completedLevels=0;this.wave=0;this.runTime=0;this.player=null;this.enemies=[];this.bullets=[];this.effects=[];this.audio=new T.Audio();
    this.base={x:480,y:454};this.ready=0;this.loop=this.loop.bind(this);requestAnimationFrame(this.loop);
  };
  T.Game.prototype.start=function(mode){this.audio.unlock();this.mode=mode||this.mode||'normal';this.sessionLevels=(this.mode==='boss'||this.mode==='endless')?1:T.Config.totalLevels;this.score=0;this.completedLevels=0;this.wave=0;this.runTime=0;this.level=this.mode==='boss'?2:1;this.updateRecordLabel();this.loadLevel(this.level)};
  T.Game.prototype.recordKey=function(){return 'tank-game-best-'+this.mode};
  T.Game.prototype.getRecord=function(){try{return JSON.parse(localStorage.getItem(this.recordKey())||'null')}catch(e){return null}};
  T.Game.prototype.updateRecordLabel=function(){var el=document.getElementById('bestRecord');if(!el)return;var names={normal:'普通模式',challenge:'挑战模式',boss:'Boss 模式',endless:'无尽模式'},record=this.getRecord();el.textContent=names[this.mode]+' · '+(record?(this.mode==='endless'?record.wave+' 波':String(record.score).padStart(4,'0')):'暂无')};
  T.Game.prototype.saveRecord=function(){var value=this.mode==='endless'?{wave:this.wave,score:this.score}:{score:this.score};try{var old=this.getRecord();if(!old||(this.mode==='endless'?value.wave>old.wave:value.score>old.score))localStorage.setItem(this.recordKey(),JSON.stringify(value))}catch(e){}this.updateRecordLabel()};
  T.Game.prototype.loadLevel=function(level){
    var C=T.Config;this.state='playing';this.level=level;this.ready=1.6;
    this.map=new T.Map(level);
    var challenge=this.mode==='challenge';
    this.player=new T.Tank(480,500,'#9cf5d2',{type:'player',health:challenge?75:100,speed:challenge?200:C.playerSpeed});
    var sets={1:[['scout',120,145],['guard',820,145],['scout',240,345],['guard',720,345]],2:[['scout',120,145],['guard',820,145],['heavy',240,345],['heavy',720,345],['boss',480,104]]};
    if(this.mode==='boss')sets[2]=[['boss',480,104]];
    if(this.mode==='endless')sets[1]=[];
    this.enemies=(sets[level]||sets[1]).map(function(item){var type=C.enemyTypes[item[0]],damage=type.damage*(challenge?1.18:1),cooldown=type.cooldown*(challenge?.9:1);return new T.Tank(item[1],item[2],type.color,{type:item[0],radius:type.radius,health:type.health,speed:type.speed,cooldown:cooldown,damage:damage})});
    this.bullets=[];this.effects=[];this.input.fire=false;this.input.pointerMoved=false;if(level===2)this.audio.boss();
    if(this.mode==='endless'){this.wave=1;this.spawnEndlessWave()}
    document.getElementById('statusText').textContent=(this.mode==='boss'?'Boss 模式 · ':(this.mode==='endless'?'无尽模式 · 第'+this.wave+'波 · ':'第'+level+'关 · '))+(level===2?'关底指挥官 · 准备':'准备');document.getElementById('levelValue').textContent=this.mode==='boss'?'B':(this.mode==='endless'?'W'+this.wave:level);
    document.getElementById('pauseButton').disabled=false;document.getElementById('fireTopButton').disabled=false;document.getElementById('menuPanel').hidden=true;document.getElementById('resultPanel').hidden=true;
  };
  T.Game.prototype.spawnEndlessWave=function(){
    var C=T.Config,positions=[[120,145],[820,145],[240,345],[720,345],[480,120],[170,275],[790,275]],count=Math.min(7,3+Math.floor((this.wave-1)/2)),types=[];
    for(var i=0;i<count;i++){var type=(this.wave>=3&&i===count-1)?'heavy':(i%3===0?'scout':'guard');types.push([type,positions[i][0],positions[i][1]])}
    this.enemies=types.map(function(item){var cfg=C.enemyTypes[item[0]],scale=1+Math.min(.35,(this.wave-1)*.04);return new T.Tank(item[1],item[2],cfg.color,{type:item[0],radius:cfg.radius,health:Math.round(cfg.health*scale),speed:cfg.speed*(1+Math.min(.16,(this.wave-1)*.02)),cooldown:cfg.cooldown,damage:cfg.damage*(1+Math.min(.2,(this.wave-1)*.025))})}.bind(this));
    this.effects.push({x:480,y:72,t:0,duration:.9,color:'#d7ff8a',label:'第 '+this.wave+' 波'});this.audio.boss();document.getElementById('statusText').textContent='无尽模式 · 第'+this.wave+'波';document.getElementById('levelValue').textContent='W'+this.wave;
  };
  T.Game.prototype.continueOrRestart=function(){if(this.state==='levelComplete'&&this.mode!=='boss'&&this.level<T.Config.totalLevels)this.loadLevel(this.level+1);else this.start(this.mode)};
  T.Game.prototype.end=function(win){
    if(win){this.completedLevels=Math.max(this.completedLevels,this.mode==='boss'?1:this.level);this.audio.complete()}else this.audio.fail();this.saveRecord();
    this.state=win?(this.level<T.Config.totalLevels?'levelComplete':'won'):'lost';document.getElementById('statusText').textContent=win?(this.level<T.Config.totalLevels?'关卡完成':'任务完成'):'基地失守';
    document.getElementById('pauseButton').disabled=true;document.getElementById('fireTopButton').disabled=true;
    document.getElementById('resultPanel').hidden=false;document.getElementById('resultEyebrow').textContent=win?'MISSION COMPLETE':'MISSION FAILED';
    document.getElementById('resultTitle').textContent=win?(this.level<T.Config.totalLevels?'第'+this.level+'关完成':'任务完成'):'基地失守';document.getElementById('resultText').textContent=win?(this.level<T.Config.totalLevels?'防线稳定。准备进入下一关。':'你清除了全部敌军，守住了基地。'):(this.mode==='endless'?'你坚持到了第 '+this.wave+' 波。再试一次，刷新纪录吧。':'敌军突破了防线，再试一次吧。');document.getElementById('resultButton').textContent=win&&this.level<T.Config.totalLevels?'下一关':'再来一次';
    document.getElementById('resultScore').textContent=String(this.score).padStart(4,'0');document.getElementById('resultLevels').textContent=this.mode==='endless'?String(this.wave):this.completedLevels+' / '+this.sessionLevels;document.getElementById('resultLevelsLabel').textContent=this.mode==='endless'?'坚持波数':'完成关卡';document.getElementById('resultTime').textContent=this.formatTime(this.runTime);
  };
  T.Game.prototype.formatTime=function(seconds){var total=Math.max(0,Math.floor(seconds)),minutes=Math.floor(total/60),secs=total%60;return String(minutes).padStart(2,'0')+':'+String(secs).padStart(2,'0')};
  T.Game.prototype.fire=function(t,target){
    if(t.cool>0)return;var a=Math.atan2(target.y-t.y,target.x-t.x);t.angle=a;
    this.bullets.push(new T.Bullet(t.x+Math.cos(a)*22,t.y+Math.sin(a)*22,Math.cos(a)*C.bulletSpeed,Math.sin(a)*C.bulletSpeed,t));
    if(t.type==='player')this.audio.shoot();else this.audio.enemyShoot();
    t.cool=t.type==='player'?0.45:(t.shotInterval||1.2);t.muzzle=.12;
  };
  T.Game.prototype.getAimTarget=function(){
    var p=this.player,i=this.input;
    if(i.aimMode==='stick')return {x:p.x+i.aimVector.x*120,y:p.y+i.aimVector.y*120};
    return i.pointer;
  };
  T.Game.prototype.update=function(dt){
    if(this.state!=='playing')return;
    this.runTime+=dt;
    var m=this.input.move(),p=this.player;
    if(this.ready>0){this.ready=Math.max(0,this.ready-dt);if(this.ready===0)document.getElementById('statusText').textContent='战斗中'}
    if((m.x||m.y)&&!this.input.aimActive)p.angle=Math.atan2(m.y,m.x);
    var n=Math.hypot(m.x,m.y)||1,nx=p.x+m.x/n*C.playerSpeed*dt,ny=p.y+m.y/n*C.playerSpeed*dt;
    if(!this.map.blocked(nx,p.y))p.x=nx;if(!this.map.blocked(p.x,ny))p.y=ny;
    p.cool=Math.max(0,p.cool-dt);p.muzzle=Math.max(0,p.muzzle-dt);p.invuln=Math.max(0,(p.invuln||0)-dt);
    this.effects.forEach(function(f){f.t+=dt});this.effects=this.effects.filter(function(f){return f.t<f.duration});
    if(this.input.aimActive){var aimTarget=this.getAimTarget();p.angle=Math.atan2(aimTarget.y-p.y,aimTarget.x-p.x)}
    if(this.input.fire){var target=this.input.aimActive?this.getAimTarget():(this.input.pointerMoved?this.input.pointer:{x:p.x+Math.cos(p.angle)*100,y:p.y+Math.sin(p.angle)*100});this.fire(p,target);this.input.fire=false}
    if(this.ready<=0)this.enemies.forEach(function(e){
      e.cool=Math.max(0,e.cool-dt);e.muzzle=Math.max(0,e.muzzle-dt);e.hitFlash=Math.max(0,(e.hitFlash||0)-dt);
      var a=Math.atan2(p.y-e.y,p.x-e.x),speed=e.speed||C.enemySpeed,ex=e.x+Math.cos(a)*speed*dt,ey=e.y+Math.sin(a)*speed*dt;
      if(!this.map.blocked(ex,e.y))e.x=ex;if(!this.map.blocked(e.x,ey))e.y=ey;if(Math.random()<dt/Math.max(.55,e.shotInterval||1.3))this.fire(e,p);
    }.bind(this));
    for(var i=this.bullets.length-1;i>=0;i--){
      var b=this.bullets[i];b.prevX=b.x;b.prevY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;var wallHit=this.map.hitWall(b.x,b.y);var hit=!G.inside(b.x,b.y)||!!wallHit;
      if(wallHit)this.effects.push({x:b.x,y:b.y,t:0,duration:.24,color:wallHit.destroyed?'#d7ff8a':'#9db3b4',label:wallHit.destroyed?'掩体摧毁':'命中掩体'});
      /* 检查子弹整段轨迹，避免高速子弹在手机帧率下降时穿过目标。 */
      if(!hit&&b.owner===p){for(var j=this.enemies.length-1;j>=0;j--){var enemy=this.enemies[j];var hitRadius=enemy.type==='boss'?37:(enemy.type==='scout'?33:29);if(G.segmentDistance(b.prevX,b.prevY,b.x,b.y,enemy.x,enemy.y)<hitRadius){enemy.health-=50;enemy.hitFlash=.12;this.audio.hit();this.effects.push({x:enemy.x,y:enemy.y,t:0,duration:.25,color:enemy.type==='boss'?'#b68cff':'#d7ff8a',label:enemy.health>0?(enemy.type==='boss'?'命中指挥官':'命中'):'击破 +'+(enemy.type==='boss'?'1000':'250')});if(enemy.health<=0){this.audio.explosion();this.effects.push({x:enemy.x,y:enemy.y,t:0,duration:.7,color:enemy.type==='boss'?'#b68cff':(enemy.type==='heavy'?'#ffbf78':'#d7ff8a'),kind:'explosion'});this.enemies.splice(j,1);this.score+=enemy.type==='boss'?1000:250}hit=true;break}}}
      else if(!hit&&b.owner!==p&&G.segmentDistance(b.prevX,b.prevY,b.x,b.y,p.x,p.y)<24){if((p.invuln||0)<=0){var damage=b.owner.damage||T.Config.playerHitDamage;p.health-=damage;p.invuln=T.Config.playerInvuln;this.audio.playerHit();this.effects.push({x:p.x,y:p.y,t:0,duration:.3,color:'#ff8f9e',label:'受到攻击 -'+damage})}hit=true}
      if(hit||b.life<=0)this.bullets.splice(i,1);
    }
    if(p.health<=0)this.end(false);if(!this.enemies.length){if(this.mode==='endless'&&this.state==='playing'){this.wave+=1;this.spawnEndlessWave()}else this.end(true)}
    document.getElementById('healthValue').textContent=Math.max(0,p.health);document.getElementById('enemyValue').textContent=this.enemies.length;document.getElementById('scoreValue').textContent=String(this.score).padStart(4,'0');
  };
  T.Game.prototype.draw=function(){
    var x=this.ctx;x.clearRect(0,0,960,540);x.fillStyle='#111b22';x.fillRect(0,0,960,540);x.strokeStyle='rgba(145,245,207,.08)';
    for(var i=0;i<960;i+=30){x.beginPath();x.moveTo(i,0);x.lineTo(i,540);x.stroke()}for(var j=0;j<540;j+=30){x.beginPath();x.moveTo(0,j);x.lineTo(960,j);x.stroke()}
    this.map.draw(x);
    if(this.player&&(this.input.pointerMoved||this.input.aimActive)){var target=this.getAimTarget(),dx=target.x-this.player.x,dy=target.y-this.player.y,len=Math.hypot(dx,dy)||1,range=Math.min(len,120),tx=this.player.x+dx/len*range,ty=this.player.y+dy/len*range;x.save();x.strokeStyle='rgba(215,255,138,.42)';x.setLineDash([5,6]);x.beginPath();x.moveTo(this.player.x,this.player.y);x.lineTo(tx,ty);x.stroke();x.setLineDash([]);x.strokeStyle='#d7ff8a';x.lineWidth=1.5;x.beginPath();x.arc(tx,ty,9,0,Math.PI*2);x.moveTo(tx-14,ty);x.lineTo(tx+14,ty);x.moveTo(tx,ty-14);x.lineTo(tx,ty+14);x.stroke();x.restore()}
    this.bullets.forEach(function(b){x.save();x.strokeStyle='rgba(255,231,154,.38)';x.lineWidth=3;x.lineCap='round';x.beginPath();x.moveTo(b.prevX,b.prevY);x.lineTo(b.x,b.y);x.stroke();x.fillStyle='#ffe79a';x.shadowColor='#ffe79a';x.shadowBlur=10;x.beginPath();x.arc(b.x,b.y,5,0,Math.PI*2);x.fill();x.restore()});
    if(this.player)this.player.draw(x);this.enemies.forEach(function(e){e.draw(x,Math.atan2(this.player.y-e.y,this.player.x-e.x))}.bind(this));
    this.effects.forEach(function(f){var q=f.t/f.duration;x.save();x.globalAlpha=1-q;if(f.kind==='explosion'){for(var n=0;n<10;n++){var a=n*Math.PI*2/10,r=8+q*30+(n%3)*4;x.fillStyle=f.color;x.beginPath();x.arc(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,Math.max(1,4*(1-q)),0,Math.PI*2);x.fill()}x.strokeStyle=f.color;x.lineWidth=3;x.beginPath();x.arc(f.x,f.y,10+q*28,0,Math.PI*2);x.stroke()}else{var r=8+q*22;x.strokeStyle=f.color;x.lineWidth=3;x.beginPath();x.arc(f.x,f.y,r,0,Math.PI*2);x.stroke();x.fillStyle=f.color;x.font='bold 13px ui-monospace';x.textAlign='center';x.fillText(f.label,f.x,f.y-25-q*12)}x.restore()});
    if(this.ready>0&&this.state==='playing'){x.save();x.fillStyle='rgba(215,255,138,.9)';x.font='bold 18px ui-monospace';x.textAlign='center';x.fillText('第 '+this.level+' 关',480,72);x.fillStyle='rgba(244,251,248,.72)';x.font='11px ui-monospace';x.fillText('准备进入战场',480,92);x.restore()}
    x.fillStyle='#d7ff8a';x.font='11px ui-monospace';x.fillText('BASE',460,480);
  };
  T.Game.prototype.loop=function(t){var dt=Math.min((t-this.last)/1000,.04)||0;this.last=t;this.update(dt);this.draw();requestAnimationFrame(this.loop)};
})();
