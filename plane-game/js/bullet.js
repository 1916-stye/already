// ========== 子弹系统 ==========

class Bullet {
    constructor(x, y, vx, vy, damage, color, size, owner) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.color = color;
        this.size = size || 3;
        this.owner = owner; // 'player' | 'enemy' | 'boss'
        this.alive = true;
        this.id = genId();
        this.trail = []; // 尾迹粒子
        this.life = 0;
    }

    update(dt) {
        this.life += dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // 尾迹
        if (this.life % 0.02 < dt) {
            this.trail.push({ x: this.x, y: this.y, alpha: 1 });
        }
        for (let t of this.trail) {
            t.alpha -= dt * 3;
        }
        this.trail = this.trail.filter(t => t.alpha > 0);

        // 出界则标记死亡
        if (this.y < -30 || this.y > 850 || this.x < -30 || this.x > 510) {
            this.alive = false;
        }
    }

    draw(ctx) {
        if (!this.alive) return;

        // 绘制尾迹
        for (let t of this.trail) {
            ctx.globalAlpha = t.alpha * 0.4;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(t.x, t.y, this.size * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 发光效果
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // 内核高亮
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

/** 子弹对象池 */
class BulletPool {
    constructor() {
        this.pool = [];
    }

    get(x, y, vx, vy, damage, color, size, owner) {
        if (this.pool.length > 0) {
            const b = this.pool.pop();
            b.x = x; b.y = y; b.vx = vx; b.vy = vy;
            b.damage = damage; b.color = color; b.size = size;
            b.owner = owner; b.alive = true;
            b.trail = []; b.life = 0;
            return b;
        }
        return new Bullet(x, y, vx, vy, damage, color, size, owner);
    }

    release(bullet) {
        bullet.alive = false;
        this.pool.push(bullet);
    }
}

// 全局子弹池
const playerBulletPool = new BulletPool();
const enemyBulletPool = new BulletPool();