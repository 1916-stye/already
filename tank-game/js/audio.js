(function(){
  var T=window.TankGame=window.TankGame||{};
  T.Audio=function(){this.ctx=null;this.muted=false;this.master=.065};
  T.Audio.prototype.unlock=function(){if(this.muted)return;if(!this.ctx){var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this.ctx=new AC()}if(this.ctx.state==='suspended')this.ctx.resume()};
  T.Audio.prototype.setMuted=function(value){this.muted=!!value;return this.muted};
  T.Audio.prototype.tone=function(start,end,duration,type,volume,delay){if(this.muted||!this.ctx)return;var now=this.ctx.currentTime+(delay||0),osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=type||'sine';osc.frequency.setValueAtTime(start,now);osc.frequency.exponentialRampToValueAtTime(Math.max(30,end||start),now+duration);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime((volume||1)*this.master,now+.01);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain).connect(this.ctx.destination);osc.start(now);osc.stop(now+duration+.03)};
  T.Audio.prototype.noise=function(duration,volume,filterType,frequency){if(this.muted||!this.ctx)return;var length=Math.floor(this.ctx.sampleRate*duration),buffer=this.ctx.createBuffer(1,length,this.ctx.sampleRate),data=buffer.getChannelData(0),i;for(i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);var source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter(),now=this.ctx.currentTime;source.buffer=buffer;filter.type=filterType||'lowpass';filter.frequency.value=frequency||1200;gain.gain.setValueAtTime((volume||1)*this.master,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);source.connect(filter).connect(gain).connect(this.ctx.destination);source.start(now)};
  T.Audio.prototype.shoot=function(){this.noise(.035,.22,'highpass',1500);this.tone(620,230,.09,'triangle',.65)};
  T.Audio.prototype.enemyShoot=function(){this.noise(.045,.14,'bandpass',700);this.tone(300,135,.12,'triangle',.42)};
  T.Audio.prototype.hit=function(){this.tone(880,620,.075,'sine',.72);this.tone(660,420,.07,'sine',.4,.055)};
  T.Audio.prototype.playerHit=function(){this.noise(.08,.28,'lowpass',500);this.tone(190,78,.2,'triangle',.62)};
  T.Audio.prototype.explosion=function(){this.noise(.32,.85,'lowpass',850);this.tone(145,42,.36,'sine',.78)};
  T.Audio.prototype.boss=function(){this.tone(190,250,.24,'triangle',.55);this.tone(260,390,.25,'triangle',.5,.2);this.tone(340,520,.3,'sine',.42,.4)};
  T.Audio.prototype.complete=function(){this.tone(440,660,.14,'sine',.58);this.tone(554,830,.16,'sine',.52,.12);this.tone(660,990,.25,'sine',.48,.25)};
  T.Audio.prototype.fail=function(){this.tone(230,120,.2,'triangle',.55);this.tone(150,58,.3,'sine',.5,.16)};
})();
