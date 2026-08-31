(function(){
  var T=window.TankGame=window.TankGame||{};
  T.Map=function(level){
    this.level=level||1;this.walls=[];this.water=[];
    var layouts={
      1:['................................','..BB....SS....BB....SS....BB....','..BB....SS....BB....SS....BB....','.............WWWW...............','..SS..BBBB..WWWW..BBBB..SS......','..SS..BBBB..WWWW..BBBB..SS......','.............WWWW...............','..BB....SS....BB....SS....BB....','..BB....SS....BB....SS....BB....','................................'],
      2:['................................','..SS..BB........BB..SS..........','..SS..BB....SS....BB..SS........','......WW...........WW...........','..BB..WW..SS..BB..WW....BB......','..BB..WW..SS..BB..WW....BB......','......WW...........WW...........','..SS..BB....BB....BB..SS........','..SS..BB....BB....BB..SS........','................................']
    };
    var rows=layouts[this.level]||layouts[1];
    for(var y=0;y<rows.length;y++)for(var x=0;x<rows[y].length;x++){var c=rows[y][x],tile={x:30+x*28,y:115+y*28,w:26,h:26};if(c==='W')this.water.push(tile);else if(c!=='.')this.walls.push({x:tile.x,y:tile.y,w:tile.w,h:tile.h,type:c==='S'?'steel':'brick',health:c==='S'?999:2})}
  };
  T.Map.prototype.draw=function(ctx){ctx.save();this.water.forEach(function(w){ctx.fillStyle='rgba(39,125,180,.66)';ctx.fillRect(w.x,w.y,w.w,w.h);ctx.strokeStyle='rgba(118,210,255,.62)';ctx.strokeRect(w.x+.5,w.y+.5,w.w-1,w.h-1);ctx.strokeStyle='rgba(182,235,255,.28)';ctx.beginPath();ctx.moveTo(w.x+4,w.y+8);ctx.lineTo(w.x+20,w.y+8);ctx.moveTo(w.x+7,w.y+17);ctx.lineTo(w.x+23,w.y+17);ctx.stroke()});this.walls.forEach(function(w){ctx.fillStyle=w.type==='steel'?'#64748b':(w.health===1?'#8b4d3d':'#b35f3e');ctx.fillRect(w.x,w.y,w.w,w.h);ctx.strokeStyle=w.type==='steel'?'#94a3b8':'#e79a6f';ctx.strokeRect(w.x+.5,w.y+.5,w.w-1,w.h-1);if(w.type==='brick'){ctx.strokeStyle='rgba(42,15,13,.5)';ctx.beginPath();ctx.moveTo(w.x,w.y+13);ctx.lineTo(w.x+w.w,w.y+13);ctx.moveTo(w.x+13,w.y);ctx.lineTo(w.x+13,w.y+13);ctx.moveTo(w.x+7,w.y+13);ctx.lineTo(w.x+7,w.y+26);if(w.health===1){ctx.moveTo(w.x+4,w.y+4);ctx.lineTo(w.x+22,w.y+22);ctx.moveTo(w.x+22,w.y+4);ctx.lineTo(w.x+4,w.y+22)}ctx.stroke()}});ctx.fillStyle='#d7ff8a';ctx.fillRect(468,442,24,24);ctx.restore()};
  T.Map.prototype.blocked=function(x,y){if(!T.Collision.inside(x,y))return true;return this.walls.some(function(w){return T.Collision.rects({x:x-11,y:y-11,w:22,h:22},w)})};
  T.Map.prototype.hitWall=function(x,y){for(var i=this.walls.length-1;i>=0;i--){var w=this.walls[i];if(T.Collision.rects({x:x-4,y:y-4,w:8,h:8},w)){if(w.type==='steel')return {destroyed:false,type:'steel'};w.health-=1;var destroyed=w.health<=0;if(destroyed)this.walls.splice(i,1);return {destroyed:destroyed,type:'brick'};}}return null};
})();
