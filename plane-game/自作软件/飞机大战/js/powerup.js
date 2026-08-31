// ========== 道具系统 ==========

const POWERUP_TYPES = {
    fireUp: { name: '火力提升', color: COLORS.orange, icon: 'W', description: '武器等级+1' },
    speedUp: { name: '速度提升', color: COLORS.neon, icon: 'S', description: '移速提升10秒' },
    shield: { name: '护盾', color: COLORS.green, icon: 'D', description: '获得护盾' },
    heal: { name: '生命恢复', color: COLORS.red, icon: 'H', description: 'HP+1' },
    scoreX2: { name: '分数加倍', color: COLORS.gold, icon: 'X', description: '10秒分数×2' },
    bomb: { name: '炸弹补给', color: COLORS.neonPink, icon: 'B', description: '炸弹+1' },
};

const POWERUP_LIST = ['fireUp', 'speedUp', 'shield', 'heal', 'scoreX2', 'bomb'];

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = POWERUP_TYPES[type];
        this.speed = 80;
        this.size = 14;
        this.alive = true;
        this.id = genId();
        this.timer = 0;
        this.glowPhase = 0;
    }

    update(dt) {
        this.y += this.speed * dt;
        this.timer += dt;
        this.glowPhase += dt * 3;

        if (this.y > 850) {
            this.alive = false;
        }
    }

    apply(player) {
        switch (this.type) {
            case 'fireUp':
                player.weaponLevel = Math.min(player.weaponLevel + 1, player.maxWeaponLevel);
                break;
            case 'speedUp':
                player.speedBoost = player.speed * 0.3;
                player.speed += player.speedBoost;
                player.speedBoostTimer = 10;
                break;
            case 'shield':
                player.shieldActive = true;
                player.shieldTimer = 5;
                break;
            case 'heal':
                player.hp = Math.min(player.hp + 1, player.maxHp);
                break;
            case 'scoreX2':
                player.scoreMultiplier = 2;
                player.scoreMultiplierTimer = 10;
                break;
            case 'bomb':
                player.bombCount = Math.min(player.bombCount + 1, 5);
                break;
        }
        audio.playPowerUp();
    }

    draw(ctx) {
        if (!this.alive) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // 发光外圈
        const glowAlpha = 0.3 + Math.sin(this.glowPhase) * 0.2;
        ctx.strokeStyle = this.config.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = this.config.color;
        ctx.shadowBlur = 10 + Math.sin(this.glowPhase) * 5;
        ctx.globalAlpha = glowAlpha;
        ctx.beginPath();
        ctx.arc(0, 0, this.size + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // 主体
        ctx.fillStyle = this.config.color;
        ctx.shadowColor = this.config.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();

        // 内圈
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(0, 0, this.size - 3, 0, Math.PI * 2);
        ctx.fill();

        // 图标文字
        ctx.fillStyle = this.config.color;
        ctx.font = 'bold 12px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.config.icon, 0, 1);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';

        ctx.restore();
    }
}

/** 随机掉落道具 */
function maybeDropPowerUp(x, y) {
    // 15% 概率掉落
    if (Math.random() > 0.15) return null;

    // 按稀有度加权随机
    const weights = {
        fireUp: 30,
        speedUp: 20,
        shield: 15,
        heal: 15,
        scoreX2: 10,
        bomb: 10,
    };

    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let type = 'fireUp';
    for (let [key, weight] of Object.entries(weights)) {
        r -= weight;
        if (r <= 0) { type = key; break; }
    }

    return new PowerUp(x, y, type);
}