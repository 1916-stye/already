/**
 * boss.js - 飞机大战 Boss 类
 * 
 * 包含投降和清屏技能的完整反应逻辑：
 * - 投降(surrender): Boss 播放嘲讽动画，显示胜者消息
 * - 清屏(clearScreen): Boss 受到大规模伤害，播放痛苦动画，短暂眩晕
 * 
 * 依赖项（由外部注入或全局获取）：
 * - COLORS, rand, clamp, genId, degToRad (utils)
 * - audio (audio.js)
 * - enemyBulletPool (bullet.js)
 * - window.game (游戏主实例引用)
 */

// ============================================================
//  Boss 类
// ============================================================

/**
 * @param {number} level - Boss 等级 (1-5)
 * @param {object} [options] - 可选的依赖注入
 * @param {object} [options.gameRef] - 游戏实例引用
 * @param {object} [options.audioRef] - 音频管理器引用
 * @param {object} [options.bulletPoolRef] - 敌方子弹对象池引用
 */
function Boss(level, options) {
    options = options || {};
    this.level = level;
    this.x = 240;
    this.y = -100;
    this.targetY = 120;
    this.width = 120;
    this.height = 100;
    this.size = 60;

    // 生命值 - 随等级提升
    this.maxHp = 300 + (level - 1) * 150;
    this.hp = this.maxHp;
    this.alive = true;
    this.id = typeof genId === 'function' ? genId() : Date.now();

    // 阶段系统
    this.phase = 1;
    this.phaseThresholds = [0.6, 0.3];
    this.phaseTransitioning = false;
    this.phaseTransitionTimer = 0;

    // 入场动画
    this.entering = true;
    this.enterSpeed = 60;

    // 移动状态
    this.moveTimer = 0;
    this.moveDirection = 1;
    this.moveSpeed = 60;
    this.moveMinX = 80;
    this.moveMaxX = 400;

    // 射击状态
    this.fireTimer = 0;
    this.fireInterval = 1.5;
    this.patternTimer = 0;
    this.patternIndex = 0;
    this.patternDuration = 4;

    // 分数和伤害
    this.score = 5000 + (level - 1) * 2000;
    this.damage = 2;

    // ========== 投降和清屏反应状态 ==========
    this.isStunned = false;        // 是否眩晕中（被清屏后）
    this.stunTimer = 0;            // 眩晕剩余时间
    this.stunDuration = 1.5;       // 眩晕持续时间
    this.reactionMessage = '';     // 反应消息文本
    this.reactionTimer = 0;        // 反应消息显示计时器
    this.reactionColor = '';       // 反应消息颜色
    this.flashTimer = 0;           // 闪烁特效计时器
    this.flashColor = '';          // 闪烁颜色
    this.surrenderReaction = false;// 是否已触发投降反应

    // 依赖注入
    this._gameRef = options.gameRef || null;
    this._audioRef = options.audioRef || null;
    this._bulletPoolRef = options.bulletPoolRef || null;
}

// ============================================================
//  主更新循环
// ============================================================

Boss.prototype.update = function(dt, player) {
    if (!this.alive) return;

    // 反应消息计时
    if (this.reactionTimer > 0) {
        this.reactionTimer -= dt;
    }

    // 闪烁特效计时
    if (this.flashTimer > 0) {
        this.flashTimer -= dt;
    }

    // 眩晕状态
    if (this.isStunned) {
        this.stunTimer -= dt;
        if (this.stunTimer <= 0) {
            this.isStunned = false;
            this.reactionMessage = '';
        }
        return; // 眩晕期间不执行任何动作
    }

    // 阶段切换过渡
    if (this.phaseTransitioning) {
        this.phaseTransitionTimer -= dt;
        if (this.phaseTransitionTimer <= 0) {
            this.phaseTransitioning = false;
        }
        return;
    }

    // 入场动画
    if (this.entering) {
        this.y += this.enterSpeed * dt;
        if (this.y >= this.targetY) {
            this.y = this.targetY;
            this.entering = false;
        }
        return;
    }

    // 阶段切换判定
    var hpR = this.hp / this.maxHp;
    if (this.phase === 1 && hpR <= this.phaseThresholds[0]) {
        this.enterPhase(2);
    } else if (this.phase === 2 && hpR <= this.phaseThresholds[1]) {
        this.enterPhase(3);
    }

    // 移动模式
    this.moveTimer += dt;
    switch (this.phase) {
        case 1:
            this.x += this.moveDirection * this.moveSpeed * dt;
            if (this.x > this.moveMaxX) { this.x = this.moveMaxX; this.moveDirection = -1; }
            if (this.x < this.moveMinX) { this.x = this.moveMinX; this.moveDirection = 1; }
            this.fireInterval = 1.5;
            break;
        case 2:
            if (player && player.alive) {
                this.x += (player.x > this.x ? 1 : -1) * this.moveSpeed * 1.5 * dt;
            }
            this.x += Math.sin(this.moveTimer * 2) * 40 * dt;
            this.x = clamp(this.x, this.moveMinX, this.moveMaxX);
            this.fireInterval = 1.0;
            break;
        case 3:
            this.x += Math.sin(this.moveTimer * 3) * 100 * dt;
            this.x = clamp(this.x, this.moveMinX, this.moveMaxX);
            this.y = this.targetY + Math.sin(this.moveTimer * 1.5) * 30;
            this.fireInterval = 0.6;
            break;
    }

    // 射击
    this.fireTimer -= dt;
    this.patternTimer -= dt;
    if (this.patternTimer <= 0) {
        this.patternIndex = (this.patternIndex + 1) % this._patCount();
        this.patternTimer = this.patternDuration;
    }
    if (this.fireTimer <= 0) {
        this.firePattern(player);
        this.fireTimer = this.fireInterval;
    }
};

// ============================================================
//  弹幕模式
// ============================================================

Boss.prototype._patCount = function() {
    return this.phase === 1 ? 2 : (this.phase === 2 ? 3 : 4);
};

Boss.prototype.enterPhase = function(np) {
    this.phase = np;
    this.phaseTransitioning = true;
    this.phaseTransitionTimer = 1.0;
    this.patternIndex = 0;
    this.patternTimer = 0;

    var game = this._getGame();
    if (game) {
        game.enemyBullets.forEach(function(b) { b.alive = false; });
        game.triggerShake(8, 0.5);
    }
    var audio = this._getAudio();
    if (audio) audio.playBossWarning();
};

Boss.prototype.firePattern = function(player) {
    if (!player || !player.alive) return;
    var game = this._getGame();
    if (!game) return;

    var cx = this.x;
    var cy = this.y + 20;
    var bc = this.phase === 3 ? this._getColor('gold') || '#ffcc00' : this._getColor('red') || '#ff3333';
    var bs = this.phase === 3 ? 5 : 4;
    var bSpeed = 200 + this.phase * 50;

    switch (this.patternIndex) {
        case 0: this._fireCircle(cx, cy, bc, bs, bSpeed); break;
        case 1: this._fireFan(cx, cy, player, bc, bs, bSpeed); break;
        case 2: this._fireSpiral(cx, cy, bc, bs, bSpeed); break;
        case 3: this._fireTracking(cx, cy, player, bc, bs); break;
    }
};

Boss.prototype._fireCircle = function(cx, cy, color, size, speed) {
    var cnt = 12 + this.phase * 4;
    var game = this._getGame();
    var pool = this._getBulletPool();
    if (!game || !pool) return;
    for (var i = 0; i < cnt; i++) {
        var a = i / cnt * Math.PI * 2 + this.moveTimer;
        game.enemyBullets.push(pool.get(cx, cy, Math.cos(a) * speed, Math.sin(a) * speed, this.damage, color, size, 'boss'));
    }
};

Boss.prototype._fireFan = function(cx, cy, player, color, size, speed) {
    var ba = Math.atan2(player.y - cy, player.x - cx);
    var cnt = 5 + this.phase * 2;
    var sp = 0.8;
    var game = this._getGame();
    var pool = this._getBulletPool();
    if (!game || !pool) return;
    for (var i = 0; i < cnt; i++) {
        var a = ba + (i - (cnt - 1) / 2) * sp / cnt;
        game.enemyBullets.push(pool.get(cx, cy, Math.cos(a) * speed, Math.sin(a) * speed, this.damage, color, size, 'boss'));
    }
};

Boss.prototype._fireSpiral = function(cx, cy, color, size, speed) {
    var cnt = 8 + this.phase * 3;
    var ba = this.moveTimer * 3;
    var game = this._getGame();
    var pool = this._getBulletPool();
    if (!game || !pool) return;
    for (var i = 0; i < cnt; i++) {
        var a = ba + i / cnt * Math.PI * 2;
        game.enemyBullets.push(pool.get(cx, cy, Math.cos(a) * speed, Math.sin(a) * speed, this.damage, color, size, 'boss'));
    }
};

Boss.prototype._fireTracking = function(cx, cy, player, color, size) {
    var cnt = 3 + this.phase;
    var game = this._getGame();
    var pool = this._getBulletPool();
    if (!game || !pool) return;
    for (var i = 0; i < cnt; i++) {
        var a = Math.atan2(player.y - cy, player.x - cx) + (typeof rand === 'function' ? rand(-0.3, 0.3) : (Math.random() * 0.6 - 0.3));
        var sp = 150 + (typeof rand === 'function' ? rand(0, 80) : Math.random() * 80);
        game.enemyBullets.push(pool.get(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, this.damage, color, size, 'boss'));
    }
};

// ============================================================
//  伤害和状态
// ============================================================

Boss.prototype.takeDamage = function(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) {
        this.hp = 0;
        this.alive = false;
        return true; // 返回 true 表示 Boss 被击杀
    }
    return false;
};

// ============================================================
//  投降反应 (Surrender Reaction)
//  当玩家按下 R 键投降时触发
// ============================================================

/**
 * 玩家投降时 Boss 的嘲讽反应
 * @returns {object} 反应信息 { message, color, shouldFlash }
 */
Boss.prototype.onPlayerSurrender = function() {
    if (!this.alive) return null;

    // 投降时 Boss 的嘲讽台词
    var taunts = [
        '不堪一击！',
        '这就放弃了？',
        '弱者不配活着！',
        '哈哈哈！逃吧！',
        '连战的勇气都没有？',
        '胜利属于我！',
        '下一个！',
        '太让我失望了...'
    ];

    var msg = taunts[Math.floor(Math.random() * taunts.length)];
    this.reactionMessage = msg;
    this.reactionTimer = 3.0;
    this.reactionColor = '#ffcc00'; // 金色胜利消息
    this.flashTimer = 1.0;
    this.flashColor = '#ffcc00';
    this.surrenderReaction = true;

    // 播放胜利音效
    var audio = this._getAudio();
    if (audio) audio.playBossWarning();

    return {
        message: msg,
        color: '#ffcc00',
        isSurrender: true
    };
};

/**
 * 获取投降反应消息（用于 UI 显示）
 * @returns {string|null}
 */
Boss.prototype.getSurrenderMessage = function() {
    return this.surrenderReaction ? this.reactionMessage : null;
};

// ============================================================
//  清屏反应 (ClearScreen Reaction)
//  当玩家按下 X 键清屏时触发
// ============================================================

/**
 * 玩家使用清屏技能时 Boss 的反应
 * @param {number} damagePercent - 清屏造成的伤害百分比 (0-1)
 * @returns {object} 反应信息 { message, color, damageDealt, isStunned }
 */
Boss.prototype.onClearScreen = function(damagePercent) {
    if (!this.alive) return null;

    damagePercent = damagePercent || 0.15;

    // 计算伤害
    var damageDealt = Math.ceil(this.maxHp * damagePercent);
    this.hp -= damageDealt;
    if (this.hp <= 0) {
        this.hp = 0;
        this.alive = false;
    }

    // 眩晕效果
    this.isStunned = true;
    this.stunTimer = this.stunDuration;

    // 痛苦/愤怒台词
    var painMessages = [
        '啊啊啊！好痛！',
        '你竟敢...！',
        '可恶！这力量！',
        '不可能！',
        '我生气了！',
        '你会后悔的！',
        '还不够！来吧！',
        '这就是你的底牌？'
    ];

    var msg = painMessages[Math.floor(Math.random() * painMessages.length)];
    this.reactionMessage = msg;
    this.reactionTimer = this.stunDuration;
    this.reactionColor = '#ff3333'; // 红色愤怒消息
    this.flashTimer = 0.5;
    this.flashColor = '#ffffff'; // 白色闪烁表示受击

    // 播放受击音效
    var audio = this._getAudio();
    if (audio) audio.playHit();

    // 屏幕震动
    var game = this._getGame();
    if (game) game.triggerShake(10, 0.6);

    return {
        message: msg,
        color: '#ff3333',
        damageDealt: damageDealt,
        isStunned: true,
        stunDuration: this.stunDuration
    };
};

/**
 * 检查 Boss 是否处于眩晕状态
 * @returns {boolean}
 */
Boss.prototype.isStunnedNow = function() {
    return this.isStunned && this.stunTimer > 0;
};

// ============================================================
//  渲染
// ============================================================

Boss.prototype.draw = function(ctx) {
    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 闪烁特效 - 用于投降反应或清屏受击
    if (this.flashTimer > 0 && Math.floor(this.flashTimer * 16) % 2 === 0) {
        ctx.globalAlpha = 0.6;
        if (this.flashColor) {
            ctx.shadowColor = this.flashColor;
            ctx.shadowBlur = 30;
        }
    }

    var cc = this._getColor('red') || '#ff3333';
    if (this.phase === 2) cc = this._getColor('orange') || '#ff6600';
    if (this.phase === 3) cc = this._getColor('gold') || '#ffcc00';

    // 身体
    ctx.fillStyle = '#1a1a2e';
    ctx.shadowColor = cc;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(25, -30);
    ctx.lineTo(40, -10);
    ctx.lineTo(45, 15);
    ctx.lineTo(35, 35);
    ctx.lineTo(20, 45);
    ctx.lineTo(-20, 45);
    ctx.lineTo(-35, 35);
    ctx.lineTo(-45, 15);
    ctx.lineTo(-40, -10);
    ctx.lineTo(-25, -30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = cc;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 核心
    ctx.shadowColor = cc;
    ctx.shadowBlur = 20;
    var cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(0.3, cc);
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 武器吊舱
    var pods = [{ x: -35, y: -15 }, { x: 35, y: -15 }, { x: -30, y: 20 }, { x: 30, y: 20 }];
    ctx.fillStyle = '#333355';
    ctx.strokeStyle = cc;
    ctx.lineWidth = 1;
    for (var i = 0; i < pods.length; i++) {
        var p = pods[i];
        ctx.fillRect(p.x - 6, p.y - 6, 12, 12);
        ctx.strokeRect(p.x - 6, p.y - 6, 12, 12);
        ctx.fillStyle = cc;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333355';
    }

    // 引擎火焰
    ctx.fillStyle = cc;
    ctx.shadowColor = cc;
    ctx.shadowBlur = 8;
    var r = typeof rand === 'function' ? rand : function(min, max) { return Math.random() * (max - min) + min; };
    ctx.beginPath();
    ctx.moveTo(-15, 45);
    ctx.lineTo(0, 55 + r(0, 8));
    ctx.lineTo(15, 45);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-25, 42);
    ctx.lineTo(-30, 52 + r(0, 6));
    ctx.lineTo(-20, 42);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(20, 42);
    ctx.lineTo(30, 52 + r(0, 6));
    ctx.lineTo(25, 42);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();

    // HP 血条（入场中不显示）
    if (this.entering) return;

    var bw = 300, bh = 8, bx = 240 - bw / 2, by = 15;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = cc;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    var hpR = this.hp / this.maxHp;
    var hg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    hg.addColorStop(0, this._getColor('red') || '#ff3333');
    hg.addColorStop(0.5, this._getColor('orange') || '#ff6600');
    hg.addColorStop(1, cc);
    ctx.fillStyle = hg;
    ctx.fillRect(bx + 1, by + 1, (bw - 2) * hpR, bh - 2);

    ctx.fillStyle = cc;
    ctx.font = '11px "Courier New",monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = cc;
    ctx.shadowBlur = 5;
    ctx.fillText('BOSS - 毁灭者 Lv.' + this.level, 240, by - 6);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'start';

    // 反应消息气泡（投降/清屏后显示）
    if (this.reactionMessage && this.reactionTimer > 0) {
        var alpha = this.reactionTimer < 0.5 ? this.reactionTimer / 0.5 : 1;
        var bubbleY = this.y + this.height / 2 + 30;
        var tw = this.reactionMessage.length * 9 + 16;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.strokeStyle = this.reactionColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(this.x - tw / 2, bubbleY, tw, 24, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = this.reactionColor;
        ctx.font = 'bold 12px "Courier New",monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.reactionMessage, this.x, bubbleY + 17);
        ctx.textAlign = 'start';
        ctx.globalAlpha = 1;
    }
};

// ============================================================
//  依赖获取辅助方法
// ============================================================

Boss.prototype._getGame = function() {
    if (this._gameRef) return this._gameRef;
    return typeof window !== 'undefined' && window.game ? window.game : null;
};

Boss.prototype._getAudio = function() {
    if (this._audioRef) return this._audioRef;
    return typeof audio !== 'undefined' ? audio : null;
};

Boss.prototype._getBulletPool = function() {
    if (this._bulletPoolRef) return this._bulletPoolRef;
    return typeof enemyBulletPool !== 'undefined' ? enemyBulletPool : null;
};

Boss.prototype._getColor = function(name) {
    if (typeof COLORS !== 'undefined' && COLORS[name]) return COLORS[name];
    var map = {
        red: '#ff3333', orange: '#ff6600', gold: '#ffcc00',
        green: '#00ff66', neon: '#00ffff', neonPink: '#ff00ff',
        yellow: '#ffff00', purple: '#9933ff', white: '#ffffff'
    };
    return map[name] || null;
};

// ============================================================
//  模块导出（兼容多种环境）
// ============================================================

// CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Boss;
}

// AMD
if (typeof define === 'function' && define.amd) {
    define(function() { return Boss; });
}

// 浏览器全局变量
if (typeof window !== 'undefined') {
    window.Boss = Boss;
}