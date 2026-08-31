// ========== 工具函数 & 常量 ==========

const COLORS = {
    bg: '#0a0a1a',
    bgStar: '#ffffff',
    neon: '#00ffff',
    neonPink: '#ff00ff',
    gold: '#ffcc00',
    green: '#00ff66',
    red: '#ff3333',
    orange: '#ff6600',
    yellow: '#ffff00',
    purple: '#9933ff',
    white: '#ffffff',
    shield: 'rgba(0, 255, 255, 0.4)',
    uiBg: 'rgba(0, 0, 0, 0.8)',
    uiBorder: '#00ffff',
};

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}

function dist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

/** 角度转弧度 */
function degToRad(deg) {
    return deg * Math.PI / 180;
}

/** 检测两个圆形是否碰撞 */
function circleCollision(x1, y1, r1, x2, y2, r2) {
    return dist(x1, y1, x2, y2) < r1 + r2;
}

/** 检测两个矩形是否碰撞 (AABB) */
function rectCollision(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/** 生成唯一 ID */
let _idCounter = 0;
function genId() {
    return ++_idCounter;
}