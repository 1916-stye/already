(function(){
  var T=window.TankGame=window.TankGame||{},C=T.Config,G=T.Collision;
  T.Game=function(canvas,input){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.input=input;this.map=new T.Map();
    this.state='menu';this.last=0;this.score=0;this.energy=0;this.level=1;this.mode='normal';this.sessionLevels=2;this.completedLevels=0;this.wave=0;this.runTime=0;this.upgrades={rapid:0,power:0,armor:0};this.shopReward=0;this.baseMaxHealth=100;this.baseHealth=100;this.baseHitCooldown=0;this.player=null;this.enemies=[];this.bullets=[];this.effects=[];this.audio=new T.Audio();
    this.base={x:480,y:454};this.ready=0;this.loop=this.loop.bind(this);this.syncUiState();requestAnimationFrame(this.loop);
  };
  T.Game.prototype.syncUiState=function(){
    var cls=['game-menu','game-playing','game-paused','game-shop','game-result'];
    document.body.classList.remove.apply(document.body.classList,cls);
    var name=this.state==='playing'?'game-playing':(this.state==='paused'?'game-paused':(this.state==='shop'?'game-shop':((this.state==='won'||this.state==='lost'||this.state==='levelComplete')?'game-result':'game-menu')));
    document.body.classList.add(name);
  };
  T.Game.prototype.start=function(mode){this.audio.unlock();this.mode=mode||this.mode||'normal';this.sessionLevels=(this.mode==='boss'||this.mode==='endless')?1:T.Config.totalLevels;this.score=0;this.energy=0;this.completedLevels=0;this.wave=0;this.runTime=0;this.upgrades={rapid:0,power:0,armor:0};this.shopReward=0;this.baseHealth=this.baseMaxHealth;this.baseHitCooldown=0;this.level=this.mode==='boss'?2:1;this.updateRecordLabel();this.updateHud();this.loadLevel(this.level)};
  T.Game.prototype.recordKey=function(){return 'tank-game-best-'+this.mode};
  T.Game.prototype.getRecord=function(){try{return JSON.parse(localStorage.getItem(this.recordKey())||'null')}catch(e){return null}};
  T.Game.prototype.updateRecordLabel=function(){var el=document.getElementById('bestRecord');if(!el)return;var names={normal:'普通模式',challenge:'挑战模式',boss:'Boss 模式',endless:'无尽模式'},record=this.getRecord();el.textContent=names[this.mode]+' · '+(record?(this.mode==='endless'?record.wave+' 波':String(record.score).padStart(4,'0')):'暂无')};
  T.Game.prototype.saveRecord=function(){var value=this.mode==='endless'?{wave:this.wave,score:this.score}:{score:this.score};try{var old=this.getRecord();if(!old||(this.mode==='endless'?value.wave>old.wave:value.score>old.score))localStorage.setItem(this.recordKey(),JSON.stringify(value))}catch(e){}this.updateRecordLabel()};
  T.Game.prototype.loadLevel=function(level){
    var C=T.Config;this.state='playing';this.syncUiState();this.level=level;this.ready=1.6;
    this.map=new T.Map(level);
    var challenge=this.mode==='challenge';
    var playerHealth=(challenge?75:100)+this.upgrades.armor*25;
    this.player=new T.Tank(480,500,'#9cf5d2',{type:'player',health:playerHealth,speed:challenge?200:C.playerSpeed});
    var sets={1:[['scout',120,145],['guard',820,145],['scout',240,345],['guard',720,345]],2:[['scout',120,145],['guard',820,145],['heavy',240,345],['heavy',720,345],['boss',480,104]]};
    if(this.mode==='boss')sets[2]=[['boss',480,104]];
    if(this.mode==='endless')sets[1]=[];
    this.enemies=(sets[level]||sets[1]).map(function(item){var type=C.enemyTypes[item[0]],damage=type.damage*(challenge?1.18:1),cooldown=type.cooldown*(challenge?.9:1);return new T.Tank(item[1],item[2],type.color,{type:item[0],radius:type.radius,health:type.health,speed:type.speed,cooldown:cooldown,damage:damage})});
    this.bullets=[];this.effects=[];this.input.fire=false;this.input.pointerMoved=false;if(level===2)this.audio.boss();
    if(this.mode==='endless'){this.wave=1;this.spawnEndlessWave()}
    document.getElementById('statusText').textContent=(this.mode==='boss'?'Boss 模式 · ':(this.mode==='endless'?'无尽模式 · 第'+this.wave+'波 · ':'第'+level+'关 · '))+(level===2?'关底指挥官 · 准备':'准备');document.getElementById('levelValue').textContent=this.mode==='boss'?'B':(this.mode==='endless'?'W'+this.wave:level);
    document.getElementById('pauseButton').disabled=false;document.getElementById('pauseButton').textContent='暂停';document.getElementById('fireTopButton').disabled=false;document.getElementById('menuPanel').hidden=true;document.getElementById('resultPanel').hidden=true;document.getElementById('shopPanel').hidden=true;this.updateHud();
  };
  T.Game.prototype.spawnEndlessWave=function(){
    var C=T.Config,positions=[[120,145],[820,145],[240,345],[720,345],[480,120],[170,275],[790,275]],count=Math.min(7,3+Math.floor((this.wave-1)/2)),types=[];
    for(var i=0;i<count;i++){var type=(this.wave>=3&&i===count-1)?'heavy':(i%3===0?'scout':'guard');types.push([type,positions[i][0],positions[i][1]])}
    this.enemies=types.map(function(item){var cfg=C.enemyTypes[item[0]],scale=1+Math.min(.35,(this.wave-1)*.04);return new T.Tank(item[1],item[2],cfg.color,{type:item[0],radius:cfg.radius,health:Math.round(cfg.health*scale),speed:cfg.speed*(1+Math.min(.16,(this.wave-1)*.02)),cooldown:cfg.cooldown,damage:cfg.damage*(1+Math.min(.2,(this.wave-1)*.025))})}.bind(this));
    this.effects.push({x:480,y:72,t:0,duration:.9,color:'#d7ff8a',label:'第 '+this.wave+' 波'});this.audio.boss();document.getElementById('statusText').textContent='无尽模式 · 第'+this.wave+'波';document.getElementById('levelValue').textContent='W'+this.wave;
  };
  T.Game.prototype.updateHud=function(){var health=this.player?Math.max(0,this.player.health):0;document.getElementById('baseHealthValue').textContent=Math.max(0,this.baseHealth); document.getElementById('healthValue').textContent=health;document.getElementById('enemyValue').textContent=this.enemies.length;document.getElementById('scoreValue').textContent=String(this.score).padStart(4,'0');document.getElementById('energyValue').textContent=String(this.energy).padStart(3,'0')};
  T.Game.prototype.hasLineOfSight=function(a,b){var distance=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.ceil(distance/14);for(var i=1;i<steps;i++){var t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;if(this.map.blocked(x,y))return false}return true};
  T.Game.prototype.updateEnemyAI=function(e,p,dt){
    var dx=p.x-e.x,dy=p.y-e.y,distance=Math.hypot(dx,dy)||1,visible=this.hasLineOfSight(e,p),dirX=dx/distance,dirY=dy/distance;
    e.stateTime+=dt;e.cool=Math.max(0,e.cool-dt);e.muzzle=Math.max(0,e.muzzle-dt);e.hitFlash=Math.max(0,(e.hitFlash||0)-dt);
    var baseDistance=Math.hypot(this.base.x-e.x,this.base.y-e.y);if(baseDistance<42){e.intent='攻击基地';e.intentColor='#ff8f9e';if(e.cool<=0){this.baseHealth=Math.max(0,this.baseHealth-(e.type==='heavy'?12:8));e.cool=e.type==='boss'?1.2:.8;this.effects.push({x:this.base.x,y:this.base.y,t:0,duration:.35,color:'#ff8f9e',label:'基地 -'+(e.type==='heavy'?12:8)});if(this.baseHealth<=0)this.end(false)}return}
    if(e.telegraph>0){e.telegraph-=dt;e.intent='准备开火';e.intentColor='#ff8f9e';e.angle=Math.atan2(dy,dx);if(e.telegraph<=0&&visible)this.fire(e,p);return}
    var desiredDistance=e.type==='guard'?205:(e.type==='scout'?115:165),moveX=dirX,moveY=dirY;
    if(e.type==='scout'){e.intent=visible?'快速接近':'搜索目标';e.intentColor='#d7ff8a';if(visible&&distance<170){var side=Math.sin(e.stateTime*2)>0?1:-1;moveX=dirX*.35-dirY*side*.9;moveY=dirY*.35+dirX*side*.9}}
    else if(e.type==='guard'){e.intent=visible?'保持距离':'寻找视线';e.intentColor='#91f5cf';if(visible&&distance<desiredDistance){moveX=-dirX;moveY=-dirY}else if(visible&&distance<desiredDistance+75){moveX=-dirY;moveY=dirX}}
    else if(e.type==='heavy'){e.intent=visible?'正面推进':'寻找路线';e.intentColor='#ffbf78'}
    else if(e.type==='boss'){e.intent=visible?'锁定目标':'重新定位';e.intentColor='#b68cff';if(visible&&distance<170){moveX=-dirY;moveY=dirX}}
    if(!visible&&e.type!=='heavy'){e.patrolAngle+=dt*(e.type==='scout'?1.3:.7);moveX=Math.cos(e.patrolAngle)*.65+dirX*.35;moveY=Math.sin(e.patrolAngle)*.65+dirY*.35}
    var norm=Math.hypot(moveX,moveY)||1,speed=e.speed||C.enemySpeed,waterSlow=this.map.inWater(e.x,e.y)?.58:1,ex=e.x+moveX/norm*speed*waterSlow*dt,ey=e.y+moveY/norm*speed*waterSlow*dt;
    if(!this.map.blocked(ex,e.y))e.x=ex;if(!this.map.blocked(e.x,ey))e.y=ey;
    if(visible&&e.cool<=.15){e.telegraph=e.type==='boss'?.8:.48;e.intent='准备开火';e.intentColor='#ff8f9e'}
  };
  T.Game.prototype.energyForEnemy=function(enemy){return enemy.type==='boss'?120:(enemy.type==='heavy'?50:(enemy.type==='scout'?25:35))};
  T.Game.prototype.openShop=function(reward){this.state='shop';this.syncUiState();this.shopReward=reward;document.getElementById('pauseButton').disabled=true;document.getElementById('fireTopButton').disabled=true;document.getElementById('resultPanel').hidden=true;document.getElementById('shopPanel').hidden=false;document.getElementById('statusText').textContent='战地补给';document.getElementById('shopReward').textContent='本场奖励 +'+String(reward).padStart(3,'0')+' 能源';document.getElementById('shopText').textContent=this.mode==='endless'?'下一波为第 '+this.wave+' 波，配置你的战术。':'第 '+this.level+' 关完成，配置下一关战术。';document.getElementById('shopContinueButton').innerHTML=this.mode==='endless'?'进入下一波 <span>→</span>':'进入下一关 <span>→</span>';this.updateShop();this.updateHud()};
  T.Game.prototype.upgradePrice=function(key){var cfg=T.Config.shopUpgrades[key],level=this.upgrades[key]||0;return Math.round(cfg.basePrice*(1+level*.65))};
  T.Game.prototype.updateShop=function(){var self=this,cfg=T.Config.shopUpgrades;document.getElementById('shopEnergyValue').textContent=String(this.energy).padStart(3,'0');document.querySelectorAll('.shop-card[data-upgrade]').forEach(function(card){var key=card.dataset.upgrade,level=self.upgrades[key]||0,max=cfg[key].maxLevel,price=self.upgradePrice(key),locked=level>=max||self.energy<price;card.classList.toggle('is-bought',level>=max);card.classList.toggle('is-disabled',locked);card.querySelector('[data-price]').textContent=level>=max?'已满级':String(price);card.querySelector('[data-level]').textContent='LV.'+level+' / '+max})};
  T.Game.prototype.buyUpgrade=function(key){if(this.state!=='shop'||!T.Config.shopUpgrades[key])return;var cfg=T.Config.shopUpgrades[key],level=this.upgrades[key]||0,price=this.upgradePrice(key);if(level>=cfg.maxLevel){document.getElementById('shopText').textContent='这项强化已经达到最高等级。';return}if(this.energy<price){document.getElementById('shopText').textContent='能源不足，先回到战场继续积累。';return}this.energy-=price;this.upgrades[key]=level+1;if(key==='armor'&&this.player){this.player.maxHealth+=25;this.player.health=Math.min(this.player.maxHealth,this.player.health+25)}if(this.audio&&this.audio.upgrade)this.audio.upgrade();document.getElementById('shopText').textContent=cfg.name+' 已完成，当前等级 LV.'+this.upgrades[key]+'。';this.updateShop();this.updateHud()};
  T.Game.prototype.continueOrRestart=function(){if(this.state==='shop'){document.getElementById('shopPanel').hidden=true;if(this.mode==='endless'){this.spawnEndlessWave()}else this.loadLevel(this.level+1);return}if(this.state==='levelComplete'&&this.mode!=='boss'&&this.level<T.Config.totalLevels)this.loadLevel(this.level+1);else this.start(this.mode)};
  T.Game.prototype.end=function(win){
    if(win){
      this.completedLevels=Math.max(this.completedLevels,this.mode==='boss'?1:this.level);
      this.audio.complete();
      var reward=this.mode==='endless'?(80+this.wave*20):(80+this.level*60);
      this.energy+=reward;this.saveRecord();
      if(this.mode==='endless'){this.wave+=1;this.openShop(reward);return}
      if(this.mode!=='boss'&&this.level<T.Config.totalLevels){this.openShop(reward);return}
    }else this.audio.fail();
    this.saveRecord();
    this.state=win?'won':'lost';this.syncUiState();document.getElementById('statusText').textContent=win?'任务完成':'基地失守';
    document.getElementById('pauseButton').disabled=true;document.getElementById('fireTopButton').disabled=true;
    document.getElementById('shopPanel').hidden=true;document.getElementById('resultPanel').hidden=false;document.getElementById('resultEyebrow').textContent=win?'MISSION COMPLETE':'MISSION FAILED';
    document.getElementById('resultTitle').textContent=win?'任务完成':'基地失守';document.getElementById('resultText').textContent=win?'你清除了全部敌军，守住了基地。':(this.mode==='endless'?'你坚持到了第 '+Math.max(1,this.wave-1)+' 波。再试一次，刷新纪录吧。':'敌军突破了防线，再试一次吧。');document.getElementById('resultButton').textContent='再来一次';
    document.getElementById('resultScore').textContent=String(this.score).padStart(4,'0');document.getElementById('resultLevels').textContent=this.mode==='endless'?String(this.wave):this.completedLevels+' / '+this.sessionLevels;document.getElementById('resultLevelsLabel').textContent=this.mode==='endless'?'坚持波数':'完成关卡';document.getElementById('resultTime').textContent=this.formatTime(this.runTime);
  };
  T.Game.prototype.formatTime=function(seconds){var total=Math.max(0,Math.floor(seconds)),minutes=Math.floor(total/60),secs=total%60;return String(minutes).padStart(2,'0')+':'+String(secs).padStart(2,'0')};
  T.Game.prototype.fire=function(t,target){
    if(t.cool>0)return;var a=Math.atan2(target.y-t.y,target.x-t.x);t.angle=a;
    var damage=t.type==='player'?50+this.upgrades.power*10:0;
    this.bullets.push(new T.Bullet(t.x+Math.cos(a)*22,t.y+Math.sin(a)*22,Math.cos(a)*C.bulletSpeed,Math.sin(a)*C.bulletSpeed,t,damage));
    if(t.type==='player')this.audio.shoot();else this.audio.enemyShoot();
    t.cool=t.type==='player'?Math.max(.22,.45*(1-this.upgrades.rapid*.15)):(t.shotInterval||1.2);t.muzzle=.12;
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
    var n=Math.hypot(m.x,m.y)||1,playerSlow=this.map.inWater(p.x,p.y)?.62:1,nx=p.x+m.x/n*C.playerSpeed*playerSlow*dt,ny=p.y+m.y/n*C.playerSpeed*playerSlow*dt;
    if(!this.map.blocked(nx,p.y))p.x=nx;if(!this.map.blocked(p.x,ny))p.y=ny;
    p.cool=Math.max(0,p.cool-dt);p.muzzle=Math.max(0,p.muzzle-dt);p.invuln=Math.max(0,(p.invuln||0)-dt);
    this.effects.forEach(function(f){f.t+=dt});this.effects=this.effects.filter(function(f){return f.t<f.duration});
    if(this.input.aimActive){var aimTarget=this.getAimTarget();p.angle=Math.atan2(aimTarget.y-p.y,aimTarget.x-p.x)}
    if(this.input.fire){var target=this.input.aimActive?this.getAimTarget():(this.input.pointerMoved?this.input.pointer:{x:p.x+Math.cos(p.angle)*100,y:p.y+Math.sin(p.angle)*100});this.fire(p,target);this.input.fire=false}
    if(this.ready<=0)this.enemies.forEach(function(e){this.updateEnemyAI(e,p,dt)}.bind(this));
    for(var i=this.bullets.length-1;i>=0;i--){
      var b=this.bullets[i];b.prevX=b.x;b.prevY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;var wallHit=this.map.hitWall(b.x,b.y);var hit=!G.inside(b.x,b.y)||!!wallHit;
      if(wallHit)this.effects.push({x:b.x,y:b.y,t:0,duration:.24,color:wallHit.destroyed?'#d7ff8a':'#9db3b4',label:wallHit.destroyed?'掩体摧毁':'命中掩体'});
      /* 检查子弹整段轨迹，避免高速子弹在手机帧率下降时穿过目标。 */
      if(!hit&&b.owner===p){for(var j=this.enemies.length-1;j>=0;j--){var enemy=this.enemies[j];var hitRadius=enemy.type==='boss'?37:(enemy.type==='scout'?33:29);if(G.segmentDistance(b.prevX,b.prevY,b.x,b.y,enemy.x,enemy.y)<hitRadius){enemy.health-=b.damage||50;enemy.hitFlash=.12;this.audio.hit();this.effects.push({x:enemy.x,y:enemy.y,t:0,duration:.25,color:enemy.type==='boss'?'#b68cff':'#d7ff8a',label:enemy.health>0?(enemy.type==='boss'?'命中指挥官':'命中'):'击破 +'+(enemy.type==='boss'?'1000':'250')});if(enemy.health<=0){var energyGain=this.energyForEnemy(enemy);this.audio.explosion();this.effects.push({x:enemy.x,y:enemy.y,t:0,duration:.7,color:enemy.type==='boss'?'#b68cff':(enemy.type==='heavy'?'#ffbf78':'#d7ff8a'),kind:'explosion'});this.effects.push({x:enemy.x,y:enemy.y-20,t:0,duration:.8,color:'#d7ff8a',label:'+'+energyGain+' 能源'});this.enemies.splice(j,1);this.score+=enemy.type==='boss'?1000:250;this.energy+=energyGain}hit=true;break}}}
      else if(!hit&&b.owner!==p&&G.segmentDistance(b.prevX,b.prevY,b.x,b.y,p.x,p.y)<24){if((p.invuln||0)<=0){var damage=b.owner.damage||T.Config.playerHitDamage;p.health-=damage;p.invuln=T.Config.playerInvuln;this.audio.playerHit();this.effects.push({x:p.x,y:p.y,t:0,duration:.3,color:'#ff8f9e',label:'受到攻击 -'+damage})}hit=true}
      if(hit||b.life<=0)this.bullets.splice(i,1);
    }
    if(p.health<=0)this.end(false);if(!this.enemies.length&&this.state==='playing')this.end(true);if(this.baseHealth<=0&&this.state==='playing')this.end(false);
    this.updateHud();
  };
  T.Game.prototype.draw=function(){
    var x=this.ctx;x.clearRect(0,0,960,540);x.fillStyle='#111b22';x.fillRect(0,0,960,540);x.strokeStyle='rgba(145,245,207,.08)';
    for(var i=0;i<960;i+=30){x.beginPath();x.moveTo(i,0);x.lineTo(i,540);x.stroke()}for(var j=0;j<540;j+=30){x.beginPath();x.moveTo(0,j);x.lineTo(960,j);x.stroke()}
    this.map.draw(x);
    this.enemies.forEach(function(e){if(e.telegraph>0){var dx=this.player.x-e.x,dy=this.player.y-e.y,len=Math.hypot(dx,dy)||1;x.save();x.globalAlpha=.45+.35*Math.abs(Math.sin(e.telegraph*10));x.strokeStyle='#ff8f9e';x.lineWidth=2;x.setLineDash([7,5]);x.beginPath();x.moveTo(e.x,e.y);x.lineTo(this.player.x,this.player.y);x.stroke();x.setLineDash([]);x.strokeStyle='#ff8f9e';x.beginPath();x.arc(this.player.x,this.player.y,13,0,Math.PI*2);x.stroke();x.restore()}}.bind(this));
    if(this.player&&(this.input.pointerMoved||this.input.aimActive)){var target=this.getAimTarget(),dx=target.x-this.player.x,dy=target.y-this.player.y,len=Math.hypot(dx,dy)||1,range=Math.min(len,120),tx=this.player.x+dx/len*range,ty=this.player.y+dy/len*range;x.save();x.strokeStyle='rgba(215,255,138,.42)';x.setLineDash([5,6]);x.beginPath();x.moveTo(this.player.x,this.player.y);x.lineTo(tx,ty);x.stroke();x.setLineDash([]);x.strokeStyle='#d7ff8a';x.lineWidth=1.5;x.beginPath();x.arc(tx,ty,9,0,Math.PI*2);x.moveTo(tx-14,ty);x.lineTo(tx+14,ty);x.moveTo(tx,ty-14);x.lineTo(tx,ty+14);x.stroke();x.restore()}
    this.bullets.forEach(function(b){x.save();x.strokeStyle='rgba(255,231,154,.38)';x.lineWidth=3;x.lineCap='round';x.beginPath();x.moveTo(b.prevX,b.prevY);x.lineTo(b.x,b.y);x.stroke();x.fillStyle='#ffe79a';x.shadowColor='#ffe79a';x.shadowBlur=10;x.beginPath();x.arc(b.x,b.y,5,0,Math.PI*2);x.fill();x.restore()});
    if(this.player)this.player.draw(x);this.enemies.forEach(function(e){e.draw(x,Math.atan2(this.player.y-e.y,this.player.x-e.x))}.bind(this));
    this.effects.forEach(function(f){var q=f.t/f.duration;x.save();x.globalAlpha=1-q;if(f.kind==='explosion'){for(var n=0;n<10;n++){var a=n*Math.PI*2/10,r=8+q*30+(n%3)*4;x.fillStyle=f.color;x.beginPath();x.arc(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,Math.max(1,4*(1-q)),0,Math.PI*2);x.fill()}x.strokeStyle=f.color;x.lineWidth=3;x.beginPath();x.arc(f.x,f.y,10+q*28,0,Math.PI*2);x.stroke()}else{var r=8+q*22;x.strokeStyle=f.color;x.lineWidth=3;x.beginPath();x.arc(f.x,f.y,r,0,Math.PI*2);x.stroke();x.fillStyle=f.color;x.font='bold 13px ui-monospace';x.textAlign='center';x.fillText(f.label,f.x,f.y-25-q*12)}x.restore()});
    if(this.ready>0&&this.state==='playing'){x.save();x.fillStyle='rgba(215,255,138,.9)';x.font='bold 18px ui-monospace';x.textAlign='center';x.fillText('第 '+this.level+' 关',480,72);x.fillStyle='rgba(244,251,248,.72)';x.font='11px ui-monospace';x.fillText('准备进入战场',480,92);x.restore()}
    x.fillStyle=this.baseHealth<40?'#ff8f9e':'#d7ff8a';x.fillRect(468,442,24,24);x.strokeStyle='rgba(255,255,255,.6)';x.strokeRect(468.5,442.5,23,23);x.fillStyle='#d7ff8a';x.font='11px ui-monospace';x.fillText('BASE',460,480);
  };
  T.Game.prototype.loop=function(t){var dt=Math.min((t-this.last)/1000,.04)||0;this.last=t;this.update(dt);this.draw();requestAnimationFrame(this.loop)};
})();
