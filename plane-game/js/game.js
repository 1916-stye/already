// ========== 游戏主逻辑 ==========

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 480;
        this.height = 800;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // 游戏状态
        this.state = 'MENU'; // MENU | PLAYING | PAUSED | BOSS_INTRO | BOSS_FIGHT | GAME_OVER | VICTORY

        // 实体列表
        this.player = null;
        this.playerBullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.powerups = [];
        this.particles = [];
        this.boss = null;

        // 分数
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('planeWarHighScore')) || 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;
        this.isNewRecord = false;

        // 波次
        this.wave = 1;
        this.waveTimer = 0;
        this.waveDelay = 2;
        this.waveEnemies = [];
        this.waveEnemyIndex = 0;
        this.waveEnemyTimer = 0;
        this.waveEnemyInterval = 0.6;
        this.waveCleared = false;
        this.bossLevel = 1;
        this.bossWaveInterval = 10; // 每10波出现Boss

        // 星空背景
        this.stars = [];
        this.initStars();

        // 输入
        this.keys = {};
        this.mouseX = 240;
        this.mouseY = 650;
        this.useMouseControl = false;

        // 特效
        this.shakeAmount = 0;
        this.shakeDuration = 0;
        this.bombFlash = 0;
        this.bossWarningTimer = 0;
        this.bossWarningDuration = 2;

        // 飞机选择
        this.selectedPlane = 0;

        this.setupInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // 暴露全局引用
        window.game = this;

        this.lastTime = 0;
        this.loop(0);
    }

    // ========== 初始化 ==========

    initStars() {
        this.stars = [];
        for (let i = 0; i < 150; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 40 + 20,
                brightness: Math.random() * 0.5 + 0.5,
                layer: Math.floor(Math.random() * 3), // 0=slow, 1=medium, 2=fast
            });
        }
    }

    setupInput() {
        window.addEventListener('keydown', e => {
            this.keys[e.key] = true;
            // 阻止方向键滚动页面
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
            // 菜单交互
            if (this.state === 'MENU' && (e.key === 'Enter' || e.key === ' ')) {
                this.startGame();
            }
            if (this.state === 'PAUSED') {
                if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
                    this.resumeGame();
                }
            }
            if (this.state === 'PLAYING' || this.state === 'BOSS_FIGHT') {
                if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
                    this.pauseGame();
                }
            }
            if (this.state === 'GAME_OVER' || this.state === 'VICTORY') {
                if (e.key === 'Enter' || e.key === ' ') {
                    this.restartGame();
                }
            }
        });

        window.addEventListener('keyup', e => {
            this.keys[e.key] = false;
        });

        // 鼠标 / 触摸
        this.canvas.addEventListener('mousemove', e => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = (e.clientX - rect.left) * (this.width / rect.width);
            this.mouseY = (e.clientY - rect.top) * (this.height / rect.height);
            this.useMouseControl = true;
        });

        this.canvas.addEventListener('mousedown', e => {
            this.useMouseControl = true;
            audio.init();
            if (this.state === 'MENU') this.startGame();
            if (this.state === 'GAME_OVER' || this.state === 'VICTORY') this.restartGame();
        });

        this.canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            audio.init();
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = (e.touches[0].clientX - rect.left) * (this.width / rect.width);
            this.mouseY = (e.touches[0].clientY - rect.top) * (this.height / rect.height);
            this.useMouseControl = true;
            if (this.state === 'MENU') this.startGame();
            if (this.state === 'GAME_OVER' || this.state === 'VICTORY') this.restartGame();
        });

        this.canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = (e.touches[0].clientX - rect.left) * (this.width / rect.width);
            this.mouseY = (e.touches[0].clientY - rect.top) * (this.height / rect.height);
        });

        // 键盘按下时也初始化音频
        window.addEventListener('keydown', () => audio.init(), { once: true });
    }

    resize() {
        const container = document.getElementById('game-container');
        const maxW = Math.min(window.innerWidth, 480);
        const maxH = Math.min(window.innerHeight, 800);
        const ratio = this.width / this.height;

        let w, h;
        if (maxW / maxH > ratio) {
            h = maxH;
            w = h * ratio;
        } else {
            w = maxW;
            h = w / ratio;
        }
        container.style.width = w + 'px';
        container.style.height = h + 'px';
    }

    // ========== 游戏循环 ==========

    loop(timestamp) {
        if (this.lastTime === 0) this.lastTime = timestamp;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); // 防止大帧跳跃
        this.lastTime = timestamp;

        this.update(dt);
        this.render();
        this.updateUI();

        requestAnimationFrame(t => this.loop(t));
    }

    update(dt) {
        // 更新星空
        for (let s of this.stars) {
            s.y += s.speed * dt * (1 + s.layer * 0.5);
            if (s.y > this.height) {
                s.y = -5;
                s.x = Math.random() * this.width;
            }
        }

        // 炸弹闪光衰减
        if (this.bombFlash > 0) this.bombFlash -= dt * 3;

        if (this.state === 'MENU' || this.state === 'PAUSED' || this.state === 'GAME_OVER' || this.state === 'VICTORY') {
            return;
        }

        // Boss 警告倒计时
        if (this.state === 'BOSS_INTRO') {
            this.bossWarningTimer -= dt;
            if (this.bossWarningTimer <= 0) {
                this.state = 'BOSS_FIGHT';
                this.spawnBoss();
            }
            return;
        }

        // 更新玩家
        if (this.player && this.player.alive) {
            this.player.update(dt, this.keys, this.mouseX, this.mouseY, this.useMouseControl);
        }

        // 更新子弹
        for (let b of this.playerBullets) b.update(dt);
        for (let b of this.enemyBullets) b.update(dt);

        // 更新敌人
        for (let e of this.enemies) e.update(dt, this.player);

        // 更新 Boss
        if (this.boss && this.boss.alive) {
            this.boss.update(dt, this.player);
        }

        // 更新道具
        for (let p of this.powerups) p.update(dt);

        // 更新粒子
        for (let p of this.particles) p.update(dt);

        // 碰撞检测
        this.checkCollisions();

        // 清理
        this.cleanup();

        // 波次管理
        if (this.state === 'PLAYING') {
            this.manageWaves(dt);
        }

        // 连击计时
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) this.combo = 0;
        }

        // 震动衰减
        if (this.shakeDuration > 0) this.shakeDuration -= dt;

        // 检查游戏结束
        if (this.player && !this.player.alive && this.state !== 'GAME_OVER') {
            this.gameOver(false);
        }
    }

    // ========== 渲染 ==========

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // 屏幕震动
        ctx.save();
        if (this.shakeDuration > 0) {
            const dx = (Math.random() - 0.5) * this.shakeAmount * 2;
            const dy = (Math.random() - 0.5) * this.shakeAmount * 2;
            ctx.translate(dx, dy);
        }

        // 背景
        this.drawBackground(ctx);

        if (this.state === 'MENU') {
            this.drawMenuBackground(ctx);
        } else {
            // 道具
            for (let p of this.powerups) p.draw(ctx);
            // 敌人
            for (let e of this.enemies) e.draw(ctx);
            // Boss
            if (this.boss && this.boss.alive) this.boss.draw(ctx);
            // 玩家
            if (this.player && this.player.alive) this.player.draw(ctx);
            // 子弹
            for (let b of this.playerBullets) b.draw(ctx);
            for (let b of this.enemyBullets) b.draw(ctx);
            // 粒子
            for (let p of this.particles) p.draw(ctx);
        }

        // 炸弹闪光
        if (this.bombFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.bombFlash * 0.6})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.restore();

        // 菜单背景（菜单状态下绘制暗色敌机）
        if (this.state === 'MENU') {
            this.drawMenuUI(ctx);
        }
    }

    drawBackground(ctx) {
        // 深空背景
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // 网格线（科技感）
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
        ctx.lineWidth = 0.5;
        const gridSize = 40;
        for (let x = 0; x < this.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }

        // 星空
        for (let s of this.stars) {
            ctx.fillStyle = `rgba(255, 255, 255, ${s.brightness})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawMenuBackground(ctx) {
        // 装饰性敌机飞过
        // 在菜单不需要，保持简洁
    }

    drawMenuUI(ctx) {
        // 此方法用于在 Canvas 上绘制菜单背景元素
        // 实际菜单 UI 由 DOM 层处理
    }

    // ========== 碰撞检测 ==========

    checkCollisions() {
        if (!this.player || !this.player.alive) return;

        // 玩家子弹 vs 敌人
        for (let b of this.playerBullets) {
            if (!b.alive) continue;
            for (let e of this.enemies) {
                if (!e.alive) continue;
                if (circleCollision(b.x, b.y, b.size, e.x, e.y, e.size)) {
                    b.alive = false;
                    const killed = e.takeDamage(b.damage);
                    if (killed) {
                        this.onEnemyKilled(e);
                    }
                    break;
                }
            }
            // 玩家子弹 vs Boss
            if (b.alive && this.boss && this.boss.alive && !this.boss.entering) {
                if (circleCollision(b.x, b.y, b.size, this.boss.x, this.boss.y, this.boss.size)) {
                    b.alive = false;
                    const killed = this.boss.takeDamage(b.damage);
                    if (killed) {
                        this.onBossKilled();
                    }
                }
            }
        }

        // 敌方子弹 vs 玩家
        for (let b of this.enemyBullets) {
            if (!b.alive) continue;
            if (circleCollision(b.x, b.y, b.size, this.player.x, this.player.y, this.player.radius)) {
                b.alive = false;
                this.player.takeDamage(b.damage);
            }
        }

        // 玩家 vs 敌人（碰撞伤害）
        for (let e of this.enemies) {
            if (!e.alive) continue;
            if (circleCollision(this.player.x, this.player.y, this.player.radius + 8, e.x, e.y, e.size)) {
                this.player.takeDamage(1);
                if (e.type === 'suicide') {
                    e.alive = false;
                    this.spawnExplosion(e.x, e.y, 15, [COLORS.orange, COLORS.yellow, COLORS.red]);
                }
            }
        }

        // 玩家 vs 道具
        for (let p of this.powerups) {
            if (!p.alive) continue;
            if (circleCollision(this.player.x, this.player.y, 25, p.x, p.y, p.size)) {
                p.apply(this.player);
                p.alive = false;
            }
        }
    }

    // ========== 事件处理 ==========

    onEnemyKilled(enemy) {
        this.addScore(enemy.score);
        this.spawnExplosion(enemy.x, enemy.y, 12, [enemy.color, COLORS.orange, COLORS.yellow]);

        // 掉落道具
        const dropRate = enemy.type === 'elite' ? 0.8 : 0.15;
        if (Math.random() < dropRate) {
            const pu = maybeDropPowerUp(enemy.x, enemy.y);
            if (pu) this.powerups.push(pu);
        }
    }

    onBossKilled() {
        this.addScore(this.boss.score);
        // 大爆炸
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.spawnExplosion(
                    this.boss.x + rand(-40, 40),
                    this.boss.y + rand(-30, 30),
                    30,
                    [COLORS.red, COLORS.orange, COLORS.gold, COLORS.yellow]
                );
            }, i * 150);
        }
        this.triggerShake(12, 0.8);
        audio.playExplosion();
        audio.playVictory();

        // 掉落大量道具
        for (let i = 0; i < 5; i++) {
            const pu = maybeDropPowerUp(this.boss.x + rand(-30, 30), this.boss.y + rand(-20, 20));
            if (pu) this.powerups.push(pu);
        }

        this.boss = null;
        this.bossLevel++;
        this.state = 'VICTORY';
        this.showVictory();
    }

    addScore(points) {
        this.combo++;
        this.comboTimer = 2;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        const multiplier = this.player ? this.player.scoreMultiplier : 1;
        const bonus = this.combo > 10 ? Math.floor(this.combo / 10) : 0;
        this.score += Math.floor(points * multiplier) + bonus;

        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.isNewRecord = true;
            localStorage.setItem('planeWarHighScore', this.highScore);
        }
    }

    triggerBomb() {
        // 清除所有敌人
        for (let e of this.enemies) {
            if (e.alive) {
                e.alive = false;
                this.spawnExplosion(e.x, e.y, 8, [e.color, COLORS.orange]);
                this.addScore(e.score * 0.5);
            }
        }
        // 清除敌方子弹
        for (let b of this.enemyBullets) b.alive = false;

        this.bombFlash = 1;
        this.triggerShake(6, 0.4);
    }

    triggerShake(amount, duration) {
        this.shakeAmount = Math.max(this.shakeAmount, amount);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
    }

    spawnExplosion(x, y, count, colors) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = rand(50, 250);
            const life = rand(0.2, 0.6);
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                life,
                colors[Math.floor(Math.random() * colors.length)],
                rand(2, 5)
            ));
        }
    }

    // ========== 波次管理 ==========

    manageWaves(dt) {
        if (this.enemies.length > 0 || this.boss) return;

        this.waveTimer += dt;

        // 检查是否需要生成 Boss
        if (this.wave > 1 && (this.wave - 1) % this.bossWaveInterval === 0 && this.state !== 'BOSS_INTRO' && this.state !== 'BOSS_FIGHT') {
            this.startBossWarning();
            return;
        }

        if (this.waveTimer >= this.waveDelay) {
            this.waveTimer = 0;
            this.generateWave();
            this.wave++;
        }
    }

    generateWave() {
        const w = this.wave;
        const difficulty = 1 + Math.floor((w - 1) / 5) * 0.2;

        // 根据波次生成不同组合
        const enemies = [];
        if (w <= 3) {
            // 侦察机为主
            const count = 3 + w;
            for (let i = 0; i < count; i++) enemies.push('scout');
        } else if (w <= 6) {
            // 侦察机 + 战斗机
            const count = 4 + w;
            for (let i = 0; i < count; i++) {
                enemies.push(i % 3 === 0 ? 'fighter' : 'scout');
            }
        } else if (w <= 8) {
            // 战斗机 + 轰炸机 + 自杀机
            const count = 5 + w;
            for (let i = 0; i < count; i++) {
                const r = Math.random();
                if (r < 0.3) enemies.push('fighter');
                else if (r < 0.6) enemies.push('bomber');
                else enemies.push('suicide');
            }
        } else {
            // 混合 + 精英
            const count = 5 + Math.floor(w / 2);
            for (let i = 0; i < count; i++) {
                const r = Math.random();
                if (r < 0.2) enemies.push('fighter');
                else if (r < 0.45) enemies.push('bomber');
                else if (r < 0.65) enemies.push('suicide');
                else if (r < 0.8) enemies.push('elite');
                else enemies.push('scout');
            }
        }

        this.waveEnemies = enemies;
        this.waveEnemyIndex = 0;
        this.waveEnemyTimer = 0;
        this.waveEnemyInterval = Math.max(0.3, 0.8 - w * 0.03);

        // 立即生成第一个
        this.spawnNextEnemy();
    }

    spawnNextEnemy() {
        if (this.waveEnemyIndex >= this.waveEnemies.length) return;

        const type = this.waveEnemies[this.waveEnemyIndex];
        const y = rand(-60, -20);
        const enemy = createEnemy(type, y);
        this.enemies.push(enemy);
        this.waveEnemyIndex++;

        // 安排下一个
        if (this.waveEnemyIndex < this.waveEnemies.length) {
            setTimeout(() => this.spawnNextEnemy(), this.waveEnemyInterval * 1000);
        }
    }

    // ========== Boss 相关 ==========

    startBossWarning() {
        this.state = 'BOSS_INTRO';
        this.bossWarningTimer = this.bossWarningDuration;
        this.waveTimer = 0;
        // 清屏
        this.playerBullets.forEach(b => b.alive = false);
        this.enemyBullets.forEach(b => b.alive = false);
        audio.playBossWarning();

        // 显示 DOM 警告
        const warning = document.getElementById('boss-warning');
        warning.style.display = 'block';
        const bossName = warning.querySelector('.boss-name');
        bossName.textContent = '毁灭者 Lv.' + this.bossLevel;
        setTimeout(() => { warning.style.display = 'none'; }, this.bossWarningDuration * 1000);
    }

    spawnBoss() {
        this.boss = new Boss(this.bossLevel);
        this.wave++;
    }

    // ========== 游戏状态 ==========

    startGame() {
        audio.init();
        this.state = 'PLAYING';
        this.score = 0;
        this.wave = 1;
        this.waveTimer = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.comboTimer = 0;
        this.isNewRecord = false;
        this.playerBullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.powerups = [];
        this.particles = [];
        this.boss = null;
        this.bossLevel = 1;
        this.bombFlash = 0;
        this.shakeAmount = 0;
        this.shakeDuration = 0;

        this.player = new Player(this.selectedPlane);

        // 隐藏菜单
        document.getElementById('menu-screen').classList.remove('active');
        document.getElementById('hud').style.display = 'flex';
        document.getElementById('pause-screen').classList.remove('active');
        document.getElementById('gameover-screen').classList.remove('active');
        document.getElementById('boss-warning').style.display = 'none';
    }

    pauseGame() {
        if (this.state !== 'PLAYING' && this.state !== 'BOSS_FIGHT') return;
        this.state = 'PAUSED';
        document.getElementById('pause-screen').classList.add('active');
    }

    resumeGame() {
        this.state = this.boss ? 'BOSS_FIGHT' : 'PLAYING';
        document.getElementById('pause-screen').classList.remove('active');
    }

    gameOver(isVictory) {
        this.state = 'GAME_OVER';
        // 大爆炸
        if (this.player) {
            this.spawnExplosion(this.player.x, this.player.y, 40, [COLORS.neon, COLORS.neonPink, COLORS.white]);
        }
        this.triggerShake(10, 0.6);
        audio.playExplosion();

        this.showGameOver();
    }

    restartGame() {
        this.startGame();
    }

    // ========== UI 更新 ==========

    updateUI() {
        const hud = document.getElementById('hud');
        if (this.state === 'MENU' || this.state === 'GAME_OVER' || this.state === 'VICTORY') {
            if (hud.style.display !== 'none') hud.style.display = 'none';
            return;
        }

        hud.style.display = 'flex';

        // 分数
        document.getElementById('score-value').textContent = this.score;

        // 波次
        document.getElementById('wave-value').textContent = 'WAVE ' + this.wave;

        // 连击
        const comboEl = document.getElementById('combo-value');
        if (this.combo >= 5) {
            comboEl.textContent = this.combo + ' COMBO';
            comboEl.style.color = this.combo >= 20 ? COLORS.gold : COLORS.neonPink;
        } else {
            comboEl.textContent = '';
        }

        if (!this.player) return;

        // HP
        const hpRatio = this.player.hp / this.player.maxHp;
        document.getElementById('hp-value').textContent = this.player.hp + ' / ' + this.player.maxHp;
        const hpFill = document.getElementById('hp-fill');
        hpFill.style.width = (hpRatio * 100) + '%';
        hpFill.className = hpRatio <= 0.3 ? 'hp-bar-fill danger' : 'hp-bar-fill';

        // 武器等级
        document.getElementById('weapon-value').textContent = 'Lv.' + this.player.weaponLevel;

        // 炸弹
        document.getElementById('bomb-value').textContent = this.player.bombCount;

        // 技能冷却
        const cd1 = document.getElementById('bomb-cd');
        const cd2 = document.getElementById('shield-cd');
        if (this.player.bombCooldown > 0) {
            cd1.style.height = (this.player.bombCooldown / this.player.bombMaxCooldown * 100) + '%';
        } else {
            cd1.style.height = '0%';
        }
        if (this.player.shieldCooldown > 0) {
            cd2.style.height = (this.player.shieldCooldown / this.player.shieldMaxCooldown * 100) + '%';
        } else {
            cd2.style.height = '0%';
        }

        // 分数倍率
        const multEl = document.getElementById('multiplier');
        if (this.player.scoreMultiplier > 1) {
            multEl.textContent = '×' + this.player.scoreMultiplier;
            multEl.style.display = 'block';
        } else {
            multEl.style.display = 'none';
        }

        // 速度加成
        const speedEl = document.getElementById('speed-boost');
        if (this.player.speedBoostTimer > 0) {
            speedEl.textContent = 'SPEED ' + Math.ceil(this.player.speedBoostTimer) + 's';
            speedEl.style.display = 'block';
        } else {
            speedEl.style.display = 'none';
        }
    }

    showGameOver() {
        const overlay = document.getElementById('gameover-screen');
        overlay.classList.add('active');
        const h2 = overlay.querySelector('h2');
        h2.textContent = 'GAME OVER';
        h2.style.color = COLORS.red;
        h2.style.textShadow = '0 0 30px rgba(255, 51, 51, 0.6)';
        overlay.querySelector('.final-score').textContent = this.score;
        overlay.querySelector('.best-score').textContent = '最高分: ' + this.highScore;
        const newRecord = overlay.querySelector('.new-record');
        newRecord.style.display = this.isNewRecord ? 'block' : 'none';
    }

    showVictory() {
        const overlay = document.getElementById('gameover-screen');
        overlay.classList.add('active');
        overlay.querySelector('h2').textContent = 'VICTORY';
        overlay.querySelector('h2').style.color = COLORS.gold;
        overlay.querySelector('h2').style.textShadow = '0 0 30px rgba(255, 204, 0, 0.6)';
        overlay.querySelector('.final-score').textContent = this.score;
        overlay.querySelector('.best-score').textContent = '最高分: ' + this.highScore;
        const newRecord = overlay.querySelector('.new-record');
        newRecord.style.display = this.isNewRecord ? 'block' : 'none';
    }

    // ========== 清理 ==========

    cleanup() {
        this.playerBullets = this.playerBullets.filter(b => b.alive);
        this.enemyBullets = this.enemyBullets.filter(b => b.alive);
        this.enemies = this.enemies.filter(e => e.alive);
        this.powerups = this.powerups.filter(p => p.alive);
        this.particles = this.particles.filter(p => p.alive);
    }
}

// ========== 粒子类 ==========

class Particle {
    constructor(x, y, vx, vy, life, color, size) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
        this.alive = true;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.life -= dt;
        if (this.life <= 0) this.alive = false;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
}

// ========== 启动游戏 ==========
window.addEventListener('DOMContentLoaded', () => {
    new Game();

    // 飞机选择事件
    document.querySelectorAll('.plane-card').forEach((card, index) => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.plane-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            window.game.selectedPlane = index;
        });
    });

    // 默认选中第一架
    document.querySelector('.plane-card').classList.add('selected');
});