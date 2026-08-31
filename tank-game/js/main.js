(function(){var T=window.TankGame=window.TankGame||{},canvas=document.getElementById('gameCanvas'),input=new T.Input(canvas),game=new T.Game(canvas,input),selectedMode='normal';function start(){game.start(selectedMode)}function requestFire(e){e.preventDefault();game.audio.unlock();input.fire=true}document.getElementById('startButton').addEventListener('click',start);document.querySelectorAll('.mode-card[data-mode]').forEach(function(card){card.addEventListener('click',function(){selectedMode=card.dataset.mode;document.querySelectorAll('.mode-card[data-mode]').forEach(function(item){item.classList.toggle('is-selected',item===card)});game.mode=selectedMode;game.updateRecordLabel();})});document.getElementById('resultButton').addEventListener('click',function(){game.audio.unlock();game.continueOrRestart()});document.getElementById('resetButton').addEventListener('click',function(){game.state='menu';document.getElementById('menuPanel').hidden=false;document.getElementById('resultPanel').hidden=true;document.getElementById('pauseButton').disabled=true;document.getElementById('fireTopButton').disabled=true});document.getElementById('pauseButton').addEventListener('click',function(){if(game.state==='playing'){game.state='paused';this.textContent='继续';document.getElementById('statusText').textContent='已暂停'}else if(game.state==='paused'){game.state='playing';this.textContent='暂停';document.getElementById('statusText').textContent='战斗中'}});document.getElementById('soundButton').addEventListener('click',function(){var muted=game.audio.setMuted(!game.audio.muted);this.textContent=muted?'音效关':'音效开';this.setAttribute('aria-pressed',String(muted));if(!muted)game.audio.unlock()});document.querySelectorAll('[data-key]').forEach(function(btn){var key=btn.dataset.key;['pointerdown','touchstart'].forEach(function(ev){btn.addEventListener(ev,function(e){e.preventDefault();input.keys[key]=true})});['pointerup','pointercancel','touchend','pointerleave'].forEach(function(ev){btn.addEventListener(ev,function(e){e.preventDefault();input.keys[key]=false})})});document.getElementById('fireButton').addEventListener('pointerdown',requestFire);document.getElementById('fireTopButton').addEventListener('pointerdown',requestFire)})();

/* 部分手机旋转后不会立即更新 CSS orientation，用实际屏幕宽高同步提示状态。 */
(function(){
  var note=document.querySelector('.orientation-note');
  if(!note)return;
  function syncOrientation(){
    var portrait=window.innerWidth<=900&&window.innerHeight>window.innerWidth;
    document.body.classList.toggle('is-portrait',portrait);
  }
  syncOrientation();
  window.addEventListener('resize',syncOrientation);
  window.addEventListener('orientationchange',function(){window.setTimeout(syncOrientation,120)});
  var landscapeButton=document.getElementById('landscapeButton');
  if(landscapeButton)landscapeButton.addEventListener('click',function(){
    var root=document.documentElement;
    var requestFull=root.requestFullscreen||root.webkitRequestFullscreen;
    var lock=window.screen&&window.screen.orientation&&window.screen.orientation.lock;
    var fullPromise=requestFull?requestFull.call(root):Promise.resolve();
    fullPromise.then(function(){return lock?lock.call(window.screen.orientation,'landscape'):null}).catch(function(){
      note.querySelector('small').textContent='请打开手机自动旋转后重试';
    });
  });
})();
