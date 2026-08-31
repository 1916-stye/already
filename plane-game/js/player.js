// ========== 玩家系统 ==========

// 飞机类型定义
const PLANE_TYPES = [
    {
        id: 'lightning',
        name: '闪电',
        color: '#00ffff',
        engineColor: '#0066ff',
        speed: 380,
        hp: 4,
        maxHp: 4,
        fireRate: 0.12,
        damage: 1,
        description: '高速机动，射速快',
    },
    {
        id: 'flame',
        name: '烈焰',
        color: '#ff6600',
        engineColor: '#ff3300',
        speed: 280,
        hp: 6,
        maxHp: 6,
        fireRate: 0.2,
        damage: 2,
        description: '高伤害，高生命',
    },
    {
        id: 'guardian',
        name: '守护者',
        color: '#00ff66',
        engineColor: '#00cc44',
        speed: 320,
        hp: 5,
        maxHp: 5,
        fireRate: 0.16,
        damage: 1,
        description: '均衡属性，自带护盾',
    },
];

class Player {
    constructor(planeTypeIndex) {
        const config = PLANE_TYPES[planeTypeIndex];
        this.config = config;
        this.planeType = planeTypeIndex;

        this.x = 240;
        this.y = 650;
        this.width = 40;
        this.height = 50;
        this.radius = 5; // 碰撞判定点

        this.speed = config.speed;
        this.hp = config.hp;
        this.maxHp = config.maxHp;
        this.fireRate = config.fireRate;
        this.damage = config.damage;
        this.color = config.color;
        this.engineColor = config.engineColor;

        this.fireTimer = 0;
        this.alive = true;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldCooldown = 0;
        this.shieldMaxCooldown = 20;

        this.bombCount = 3;
        this.bombCooldown = 0;
        this.bombMaxCooldown = 30;

        this.weaponLevel = 1;
        this.maxWeaponLevel = 5;
        this.speedBoost = 0;
        this.speedBoostTimer = 0;
        this.scoreMultiplier = 1;
        this.scoreMultiplierTimer = 0;

        this.engineParticles = [];
        this.flashTimer = 0;
    }

    update(dt, keys, mouseX, mouseY, useMouseControl) {
        if (!this.alive) return;

        // 移动
        let dx = 0, dy = 0;
        if (useMouseControl) {
            dx = mouseX - this.x;
            dy = mouseY - this.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > 2) {
                const spd = Math.min(this.speed * dt, d);
                this.x += (dx / d) * spd;
                this.y += (dy / d) * spd;
            }
        } else {
            if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
            if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;
            if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= 1;
            if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += 1;

            if (dx !== 0 && dy !== 0) {
                dx *= 0.707;
                dy *= 0.707;
            }
            this.x += dx * this.speed * dt;
            this.y += dy * this.speed * dt;
        }

        // 边界限制
        this.x = clamp(this.x, 20, 460);
        this.y = clamp(this.y, 30, 770);

        // 射击
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
            this.shoot();
            this.fireTimer = this.fireRate;
        }

        // 无敌计时
        if (this.invincible) {
            this.invincibleTimer -= dt;
            if (this.invincibleTimer <= 0) this.invincible = false;
        }

        // 护盾计时
        if (this.shieldActive) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) this.shieldActive = false;
        }
        if (this.shieldCooldown > 0) {
            this.shieldCooldown -= dt;
        }
        if (this.bombCooldown > 0) {
            this.bombCooldown -= dt;
        }

        // 速度加成计时
        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= dt;
            if (this.speedBoostTimer <= 0) {
                this.speed = this.config.speed;
                this.speedBoost = 0;
            }
        }

        // 分数倍率计时
        if (this.scoreMultiplierTimer > 0) {
            this.scoreMultiplierTimer -= dt;
            if (this.scoreMultiplierTimer <= 0) {
                this.scoreMultiplier = 1;
            }
        }

        // 受伤闪烁
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
        }

        // 引擎粒子
        for (let p of this.engineParticles) {
            p.y += p.vy * dt;
            p.life -= dt;
        }
        this.engineParticles = this.engineParticles.filter(p => p.life > 0);

        if (Math.random() < 0.5) {
            this.engineParticles.push({
                x: this.x + rand(-6, 6),
                y: this.y + this.height / 2,
                vy: rand(80, 200),
                life: rand(0.15, 0.4),
                maxLife: 0.4,
                size: rand(1, 3),
            });
        }

        // 技能按键
        if ((keys[' '] || keys['j'] || keys['J']) && this.bombCooldown <= 0 && this.bombCount > 0) {
            this.useBomb();
        }
        if ((keys['e'] || keys['k'] || keys['K']) && this.shieldCooldown <= 0 && !this.shieldActive) {
            this.useShield();
        }

        // 一键投降 - 按 R 键
        if (keys['r'] || keys['R']) {
            this.alive = false;
            this.hp = 0;
        }
    }

    shoot() {
        const bullets = [];
        const cx = this.x;
        const cy = this.y - this.height / 2;
        const dmg = this.damage;

        switch (this.weaponLevel) {
            case 1:
                bullets.push({ x: cx, y: cy, vx: 0, vy: -600 });
                break;
            case 2:
                bullets.push({ x: cx - 6, y: cy, vx: 0, vy: -600 });
                bullets.push({ x: cx + 6, y: cy, vx: 0, vy: -600 });
                break;
            case 3:
                bullets.push({ x: cx, y: cy, vx: 0, vy: -600 });
                bullets.push({ x: cx - 10, y: cy + 5, vx: -40, vy: -580 });
                bullets.push({ x: cx + 10, y: cy + 5, vx: 40, vy: -580 });
                break;
            case 4:
                bullets.push({ x: cx - 8, y: cy, vx: 0, vy: -600 });
                bullets.push({ x: cx + 8, y: cy, vx: 0, vy: -600 });
                bullets.push({ x: cx - 16, y: cy + 5, vx: -60, vy: -560 });
                bullets.push({ x: cx + 16, y: cy + 5, vx: 60, vy: -560 });
                break;
            case 5:
                bullets.push({ x: cx - 6, y: cy, vx: 0, vy: -650 });
                bullets.push({ x: cx + 6, y: cy, vx: 0, vy: -650 });
                bullets.push({ x: cx - 14, y: cy + 3, vx: -50, vy: -600 });
                bullets.push({ x: cx + 14, y: cy + 3, vx: 50, vy: -600 });
                bullets.push({ x: cx - 22, y: cy + 8, vx: -100, vy: -500 });
                bullets.push({ x: cx + 22, y: cy + 8, vx: 100, vy: -500 });
                break;
        }

        for (let b of bullets) {
            const bullet = playerBulletPool.get(b.x, b.y, b.vx, b.vy, dmg, this.color, 3, 'player');
            if (window.game && window.game.playerBullets) {
                window.game.playerBullets.push(bullet);
            }
        }
    }

    useBomb() {
        if (this.bombCount <= 0 || this.bombCooldown > 0) return;
        this.bombCount--;
        this.bombCooldown = this.bombMaxCooldown;
        audio.playBomb();
        // 炸弹效果由 game.js 处理
        if (window.game) {
            window.game.triggerBomb();
        }
    }

    useShield() {
        if (this.shieldCooldown > 0 || this.shieldActive) return;
        this.shieldActive = true;
        this.shieldTimer = 3;
        this.shieldCooldown = this.shieldMaxCooldown;
        audio.playShield();
    }

    takeDamage(dmg) {
        if (this.invincible || !this.alive) return false;
        if (this.shieldActive) {
            this.shieldActive = false;
            this.shieldTimer = 0;
            this.invincible = true;
            this.invincibleTimer = 0.5;
            return false;
        }
        this.hp -= dmg;
        this.invincible = true;
        this.invincibleTimer = 1.5;
        this.flashTimer = 1.5;
        audio.playHit();
        if (window.game) {
            window.game.triggerShake(4, 0.2);
        }
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }
        return true;
    }

    draw(ctx) {
        if (!this.alive) return;

        // 受伤闪烁
        if (this.flashTimer > 0 && Math.floor(this.flashTimer * 20) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // 引擎粒子
        for (let p of this.engineParticles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.engineColor;
            ctx.beginPath();
            ctx.arc(p.x - this.x, p.y - this.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 护盾效果
        if (this.shieldActive) {
            ctx.strokeStyle = COLORS.neon;
            ctx.lineWidth = 2;
            ctx.shadowColor = COLORS.neon;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // 引擎火焰
        const flameGrad = ctx.createLinearGradient(0, 20, 0, 35);
        flameGrad.addColorStop(0, this.engineColor);
        flameGrad.addColorStop(0.5, '#ffffff');
        flameGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(-8, 20);
        ctx.lineTo(8, 20);
        ctx.lineTo(0, 30 + rand(0, 8));
        ctx.closePath();
        ctx.fill();

        // 机身 - 科技感飞机
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;

        // 主体
        ctx.beginPath();
        ctx.moveTo(0, -22);          // 机头
        ctx.lineTo(6, -10);          // 右侧上部
        ctx.lineTo(14, -5);          // 右侧机翼尖
        ctx.lineTo(10, 0);           // 右侧机翼根
        ctx.lineTo(6, 18);           // 右侧尾部
        ctx.lineTo(-6, 18);          // 左侧尾部
        ctx.lineTo(-10, 0);          // 左侧机翼根
        ctx.lineTo(-14, -5);         // 左侧机翼尖
        ctx.lineTo(-6, -10);         // 左侧上部
        ctx.closePath();
        ctx.fill();

        // 驾驶舱
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, -2, 3, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 装饰线
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, 5);
        ctx.lineTo(6, 5);
        ctx.stroke();

        ctx.restore();
        ctx.globalAlpha = 1;
    }

    /** 绘制小图标（用于选择界面） */
    static drawIcon(ctx, typeIndex, x, y, size) {
        const config = PLANE_TYPES[typeIndex];
        ctx.save();
        ctx.translate(x, y);
        const scale = size / 50;

        ctx.fillStyle = config.color;
        ctx.shadowColor = config.color;
        ctx.shadowBlur = 6;

        ctx.beginPath();
        ctx.moveTo(0, -22 * scale);
        ctx.lineTo(6 * scale, -10 * scale);
        ctx.lineTo(14 * scale, -5 * scale);
        ctx.lineTo(10 * scale, 0);
        ctx.lineTo(6 * scale, 18 * scale);
        ctx.lineTo(-6 * scale, 18 * scale);
        ctx.lineTo(-10 * scale, 0);
        ctx.lineTo(-14 * scale, -5 * scale);
        ctx.lineTo(-6 * scale, -10 * scale);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, -2 * scale, 3 * scale, 6 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}