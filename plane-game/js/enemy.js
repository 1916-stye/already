// ========== 敌人系统 ==========

class Enemy {
    constructor(x, y, type, hp, speed, score, color, size, fireRate, damage) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.hp = hp;
        this.maxHp = hp;
        this.speed = speed;
        this.score = score;
        this.color = color;
        this.size = size;
        this.width = size * 2;
        this.height = size * 2;
        this.fireRate = fireRate;
        this.damage = damage;
        this.fireTimer = rand(0, fireRate);
        this.alive = true;
        this.id = genId();
        this.moveTimer = rand(0, Math.PI * 2);
        this.moveAmplitude = rand(30, 80);
        this.moveFrequency = rand(1, 3);
        this.entered = false; // 是否已进入屏幕
    }

    update(dt, player) {
        if (!this.alive) return;

        this.y += this.speed * dt;
        this.moveTimer += dt * this.moveFrequency;

        // 进入屏幕后开始行为
        if (this.y > -20) {
            this.entered = true;
        }

        if (this.entered) {
            switch (this.type) {
                case 'scout':
                    // 直线飞行，轻微左右摇摆
                    this.x += Math.sin(this.moveTimer) * 40 * dt;
                    break;
                case 'fighter':
                    // 正弦波移动
                    this.x += Math.sin(this.moveTimer) * this.moveAmplitude * dt;
                    break;
                case 'bomber':
                    // 慢速，缓慢左右移动
                    this.x += Math.sin(this.moveTimer * 0.5) * 30 * dt;
                    break;
                case 'suicide':
                    // 追踪玩家
                    if (player && player.alive) {
                        const dx = player.x - this.x;
                        const dy = player.y - this.y;
                        const d = Math.sqrt(dx * dx + dy * dy);
                        if (d > 1) {
                            this.x += (dx / d) * this.speed * 1.5 * dt;
                            this.y += (dy / d) * this.speed * 1.5 * dt;
                        }
                    }
                    break;
                case 'elite':
                    // 复杂移动：正弦 + 追踪
                    this.x += Math.sin(this.moveTimer * 1.5) * 60 * dt;
                    if (player && player.alive) {
                        this.x += (player.x > this.x ? 1 : -1) * 30 * dt;
                    }
                    break;
            }
        }

        // 边界限制
        this.x = clamp(this.x, this.size, 480 - this.size);

        // 射击
        if (this.entered) {
            this.fireTimer -= dt;
            if (this.fireTimer <= 0 && window.game && player && player.alive) {
                this.shoot(player);
                this.fireTimer = this.fireRate;
            }
        }

        // 飞出屏幕底部
        if (this.y > 850) {
            this.alive = false;
        }
    }

    shoot(player) {
        const bulletColor = this.type === 'elite' ? COLORS.purple : COLORS.red;
        const bulletSize = this.type === 'elite' ? 4 : 3;
        const bulletSpeed = this.type === 'elite' ? 350 : 250;
        const bulletDamage = this.damage;

        switch (this.type) {
            case 'scout':
                // 不射击
                break;
            case 'fighter':
                // 单发朝玩家
                const a1 = Math.atan2(player.y - this.y, player.x - this.x);
                this.spawnBullet(Math.cos(a1) * bulletSpeed, Math.sin(a1) * bulletSpeed, bulletColor, bulletSize, bulletDamage);
                break;
            case 'bomber':
                // 三发扇形
                const a2 = Math.atan2(player.y - this.y, player.x - this.x);
                for (let i = -1; i <= 1; i++) {
                    const angle = a2 + i * 0.25;
                    this.spawnBullet(Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed, bulletColor, bulletSize, bulletDamage);
                }
                break;
            case 'suicide':
                // 不射击，直接撞
                break;
            case 'elite':
                // 五发扇形
                const a3 = Math.atan2(player.y - this.y, player.x - this.x);
                for (let i = -2; i <= 2; i++) {
                    const angle = a3 + i * 0.2;
                    this.spawnBullet(Math.cos(angle) * bulletSpeed * 1.3, Math.sin(angle) * bulletSpeed * 1.3, bulletColor, bulletSize, bulletDamage);
                }
                break;
        }
    }

    spawnBullet(vx, vy, color, size, damage) {
        if (!window.game || !window.game.enemyBullets) return;
        const bullet = enemyBulletPool.get(this.x, this.y + this.size, vx, vy, damage, color, size, 'enemy');
        window.game.enemyBullets.push(bullet);
    }

    takeDamage(dmg) {
        this.hp -= dmg;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            return true; // 被击杀
        }
        return false;
    }

    draw(ctx) {
        if (!this.alive) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // 血条（仅精英敌人显示）
        if (this.type === 'elite' && this.hp < this.maxHp) {
            const barW = 40;
            const barH = 4;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-barW / 2, -this.size - 10, barW, barH);
            ctx.fillStyle = this.hp / this.maxHp > 0.3 ? COLORS.green : COLORS.red;
            ctx.fillRect(-barW / 2, -this.size - 10, barW * (this.hp / this.maxHp), barH);
        }

        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 6;

        switch (this.type) {
            case 'scout':
                // 小三角形
                ctx.beginPath();
                ctx.moveTo(0, this.size);
                ctx.lineTo(-this.size * 0.7, -this.size * 0.5);
                ctx.lineTo(this.size * 0.7, -this.size * 0.5);
                ctx.closePath();
                ctx.fill();
                break;
            case 'fighter':
                // 菱形
                ctx.beginPath();
                ctx.moveTo(0, this.size);
                ctx.lineTo(-this.size * 0.8, 0);
                ctx.lineTo(0, -this.size * 0.8);
                ctx.lineTo(this.size * 0.8, 0);
                ctx.closePath();
                ctx.fill();
                break;
            case 'bomber':
                // 六边形
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = i * Math.PI / 3 - Math.PI / 2;
                    const px = Math.cos(angle) * this.size;
                    const py = Math.sin(angle) * this.size;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                break;
            case 'suicide':
                // 尖锐三角形，带警告色
                ctx.fillStyle = COLORS.orange;
                ctx.shadowColor = COLORS.orange;
                ctx.beginPath();
                ctx.moveTo(0, this.size);
                ctx.lineTo(-this.size * 0.6, -this.size * 0.6);
                ctx.lineTo(this.size * 0.6, -this.size * 0.6);
                ctx.closePath();
                ctx.fill();
                // 闪烁警告
                ctx.fillStyle = COLORS.yellow;
                ctx.shadowColor = COLORS.yellow;
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'elite':
                // 复杂形状
                ctx.fillStyle = COLORS.purple;
                ctx.shadowColor = COLORS.purple;
                ctx.beginPath();
                ctx.moveTo(0, this.size);
                ctx.lineTo(-this.size * 0.6, this.size * 0.4);
                ctx.lineTo(-this.size * 0.9, -this.size * 0.2);
                ctx.lineTo(-this.size * 0.4, -this.size * 0.8);
                ctx.lineTo(0, -this.size * 0.6);
                ctx.lineTo(this.size * 0.4, -this.size * 0.8);
                ctx.lineTo(this.size * 0.9, -this.size * 0.2);
                ctx.lineTo(this.size * 0.6, this.size * 0.4);
                ctx.closePath();
                ctx.fill();
                // 核心
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.arc(0, -this.size * 0.2, this.size * 0.25, 0, Math.PI * 2);
                ctx.fill();
                break;
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

/** 敌人生成工厂 */
function createEnemy(type, y) {
    const x = rand(30, 450);
    switch (type) {
        case 'scout':
            return new Enemy(x, y, 'scout', 1, rand(150, 250), 100, COLORS.red, 12, 999, 1);
        case 'fighter':
            return new Enemy(x, y, 'fighter', 2, rand(100, 180), 200, COLORS.red, 15, 1.5, 1);
        case 'bomber':
            return new Enemy(x, y, 'bomber', 5, rand(60, 100), 500, '#cc3333', 22, 2.0, 1);
        case 'suicide':
            return new Enemy(x, y, 'suicide', 1, rand(250, 350), 300, COLORS.orange, 11, 999, 2);
        case 'elite':
            return new Enemy(x, y, 'elite', 15, rand(80, 130), 1000, COLORS.purple, 18, 1.0, 1);
        default:
            return new Enemy(x, y, 'scout', 1, 200, 100, COLORS.red, 12, 999, 1);
    }
}