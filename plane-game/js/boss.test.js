/**
 * boss.test.js - Boss 类单元测试
 * 
 * 测试覆盖：
 * 1. 构造函数 & 初始化
 * 2. 投降反应 (onPlayerSurrender)
 * 3. 清屏反应 (onClearScreen)
 * 4. 伤害计算 (takeDamage)
 * 5. 阶段切换 (enterPhase)
 * 6. 眩晕状态 (isStunnedNow)
 * 7. 弹幕模式
 * 8. 入场动画
 * 9. 依赖注入
 * 
 * 运行方式：
 * - 浏览器：打开 test_runner.html 或在控制台粘贴运行
 * - Node.js：node js/boss.test.js（需要 mock 环境）
 */

// ============================================================
//  简易测试框架
// ============================================================
var TestRunner = {
    total: 0,
    passed: 0,
    failed: 0,
    currentSuite: '',

    suite: function(name) {
        this.currentSuite = name;
        console.log('\n===== ' + name + ' =====');
    },

    assert: function(condition, message) {
        this.total++;
        if (condition) {
            this.passed++;
            console.log('  [PASS] ' + message);
        } else {
            this.failed++;
            console.error('  [FAIL] ' + message);
        }
    },

    assertEqual: function(actual, expected, message) {
        var pass = actual === expected;
        this.total++;
        if (pass) {
            this.passed++;
            console.log('  [PASS] ' + message + ' (' + JSON.stringify(actual) + ')');
        } else {
            this.failed++;
            console.error('  [FAIL] ' + message + ' - 期望: ' + JSON.stringify(expected) + ', 实际: ' + JSON.stringify(actual));
        }
    },

    assertNotNull: function(value, message) {
        this.assert(value !== null && value !== undefined, message);
    },

    assertTrue: function(value, message) {
        this.assert(value === true, message);
    },

    assertFalse: function(value, message) {
        this.assert(value === false, message);
    },

    summary: function() {
        console.log('\n========================================');
        console.log('  测试结果: ' + this.passed + '/' + this.total + ' 通过');
        if (this.failed > 0) {
            console.error('  失败: ' + this.failed);
        } else {
            console.log('  全部通过！');
        }
        console.log('========================================\n');
    }
};

var T = TestRunner;

// ============================================================
//  Mock 对象
// ============================================================

function createMockGame() {
    return {
        enemyBullets: [],
        triggerShake: function(amount, duration) {
            this._lastShake = { amount: amount, duration: duration };
        },
        _lastShake: null,
        triggerBomb: function() {},
        triggerClear: function() {}
    };
}

function createMockAudio() {
    return {
        playBossWarning: function() { this._lastCall = 'playBossWarning'; },
        playHit: function() { this._lastCall = 'playHit'; },
        playBomb: function() { this._lastCall = 'playBomb'; },
        playExplosion: function() { this._lastCall = 'playExplosion'; },
        _lastCall: null
    };
}

function createMockBulletPool() {
    return {
        get: function(x, y, vx, vy, damage, color, size, owner) {
            return {
                x: x, y: y, vx: vx, vy: vy,
                damage: damage, color: color, size: size,
                owner: owner, alive: true
            };
        },
        release: function(b) { b.alive = false; }
    };
}

function createMockPlayer(alive) {
    return {
        x: 240, y: 650,
        alive: alive !== false,
        hp: 5, maxHp: 5
    };
}

// Mock 全局依赖
if (typeof COLORS === 'undefined') {
    var COLORS = {
        red: '#ff3333', orange: '#ff6600', gold: '#ffcc00',
        green: '#00ff66', neon: '#00ffff', neonPink: '#ff00ff',
        yellow: '#ffff00', purple: '#9933ff', white: '#ffffff'
    };
}
if (typeof rand === 'undefined') {
    var rand = function(min, max) { return Math.random() * (max - min) + min; };
}
if (typeof clamp === 'undefined') {
    var clamp = function(val, min, max) { return Math.max(min, Math.min(max, val)); };
}
if (typeof genId === 'undefined') {
    var genId = (function() { var id = 0; return function() { return ++id; }; })();
}
if (typeof audio === 'undefined') {
    var audio = { playBossWarning: function() {}, playHit: function() {} };
}
if (typeof enemyBulletPool === 'undefined') {
    var enemyBulletPool = createMockBulletPool();
}

// ============================================================
//  测试套件 1: 构造函数 & 初始化
// ============================================================

T.suite('1. 构造函数 & 初始化');

(function() {
    var boss = new Boss(1);

    T.assertEqual(boss.level, 1, '等级应为 1');
    T.assertEqual(boss.maxHp, 300, 'Lv1 最大HP应为 300');
    T.assertEqual(boss.hp, 300, 'Lv1 当前HP应为 300');
    T.assertTrue(boss.alive, 'Boss 应为存活状态');
    T.assertEqual(boss.phase, 1, '初始阶段应为 1');
    T.assertTrue(boss.entering, '应处于入场动画中');
    T.assertFalse(boss.isStunned, '不应处于眩晕状态');
    T.assertEqual(boss.reactionMessage, '', '初始反应消息为空');
    T.assertEqual(boss.score, 5000, 'Lv1 分数应为 5000');
    T.assertEqual(boss.damage, 2, '基础伤害应为 2');
})();

(function() {
    var boss = new Boss(3);
    T.assertEqual(boss.maxHp, 600, 'Lv3 最大HP应为 600 (300+2*150)');
    T.assertEqual(boss.score, 9000, 'Lv3 分数应为 9000 (5000+2*2000)');
})();

(function() {
    var boss = new Boss(5);
    T.assertEqual(boss.maxHp, 900, 'Lv5 最大HP应为 900 (300+4*150)');
    T.assertEqual(boss.score, 13000, 'Lv5 分数应为 13000 (5000+4*2000)');
})();

// ============================================================
//  测试套件 2: 投降反应 (onPlayerSurrender)
// ============================================================

T.suite('2. 投降反应 (onPlayerSurrender)');

(function() {
    var mockGame = createMockGame();
    var mockAudio = createMockAudio();
    var boss = new Boss(1, { gameRef: mockGame, audioRef: mockAudio });

    // 完成入场
    boss.y = boss.targetY;
    boss.entering = false;

    var result = boss.onPlayerSurrender();

    T.assertNotNull(result, '投降反应应返回结果对象');
    T.assertTrue(result.isSurrender, '应为投降事件');
    T.assertEqual(result.color, '#ffcc00', '颜色应为金色');
    T.assertEqual(typeof result.message, 'string', '消息应为字符串');
    T.assertTrue(result.message.length > 0, '消息不应为空');
    T.assertTrue(boss.surrenderReaction, 'surrenderReaction 应被设为 true');
    T.assertTrue(boss.reactionMessage.length > 0, 'reactionMessage 应有内容');
    T.assertEqual(boss.reactionColor, '#ffcc00', 'reactionColor 应为金色');
    T.assertTrue(boss.reactionTimer > 0, 'reactionTimer 应大于0');
    T.assertTrue(boss.flashTimer > 0, 'flashTimer 应大于0');
    T.assertEqual(boss.flashColor, '#ffcc00', 'flashColor 应为金色');
    T.assertEqual(mockAudio._lastCall, 'playBossWarning', '应播放 Boss 警告音效');
})();

(function() {
    // 测试投降消息包含在预定义列表中
    var boss = new Boss(1);
    boss.y = boss.targetY;
    boss.entering = false;

    var validMessages = [
        '不堪一击！', '这就放弃了？', '弱者不配活着！',
        '哈哈哈！逃吧！', '连战的勇气都没有？', '胜利属于我！',
        '下一个！', '太让我失望了...'
    ];

    // 运行多次确保随机消息都在有效范围内
    for (var i = 0; i < 20; i++) {
        var b = new Boss(1);
        b.y = b.targetY;
        b.entering = false;
        b.onPlayerSurrender();
        T.assertTrue(
            validMessages.indexOf(b.reactionMessage) >= 0,
            '投降消息应在有效列表中: ' + b.reactionMessage
        );
    }
})();

(function() {
    // 测试投降后获取消息
    var boss = new Boss(1);
    boss.y = boss.targetY;
    boss.entering = false;
    boss.onPlayerSurrender();

    var msg = boss.getSurrenderMessage();
    T.assertNotNull(msg, 'getSurrenderMessage 应返回消息');
    T.assertEqual(msg, boss.reactionMessage, '消息应与内部状态一致');
})();

(function() {
    // 测试 Boss 已死亡时不触发投降反应
    var boss = new Boss(1);
    boss.alive = false;
    var result = boss.onPlayerSurrender();
    T.assertEqual(result, null, '已死亡 Boss 投降反应应返回 null');
})();

// ============================================================
//  测试套件 3: 清屏反应 (onClearScreen)
// ============================================================

T.suite('3. 清屏反应 (onClearScreen)');

(function() {
    var mockGame = createMockGame();
    var mockAudio = createMockAudio();
    var boss = new Boss(1, { gameRef: mockGame, audioRef: mockAudio });

    // 完成入场
    boss.y = boss.targetY;
    boss.entering = false;

    var hpBefore = boss.hp;
    var result = boss.onClearScreen(0.15);

    T.assertNotNull(result, '清屏反应应返回结果对象');
    T.assertTrue(result.isStunned, '应被眩晕');
    T.assertEqual(result.stunDuration, 1.5, '眩晕持续时间应为 1.5 秒');
    T.assertEqual(result.color, '#ff3333', '颜色应为红色');
    T.assertEqual(typeof result.message, 'string', '消息应为字符串');
    T.assertTrue(result.damageDealt > 0, '伤害值应大于0');
    T.assertEqual(result.damageDealt, hpBefore - boss.hp, '伤害值应与 HP 减少量一致');
    T.assertEqual(boss.hp, hpBefore - Math.ceil(boss.maxHp * 0.15), 'HP 应减少 15%');
    T.assertTrue(boss.isStunned, 'Boss 应处于眩晕状态');
    T.assertTrue(boss.stunTimer > 0, '眩晕计时器应大于0');
    T.assertEqual(boss.reactionColor, '#ff3333', '反应颜色应为红色');
    T.assertEqual(boss.flashColor, '#ffffff', '闪烁颜色应为白色');
    T.assertEqual(mockAudio._lastCall, 'playHit', '应播放受击音效');
    T.assertNotNull(mockGame._lastShake, '应触发屏幕震动');
    T.assertEqual(mockGame._lastShake.amount, 10, '震动幅度应为 10');
})();

(function() {
    // 测试清屏直接击杀 Boss
    var boss = new Boss(1);
    boss.y = boss.targetY;
    boss.entering = false;

    var result = boss.onClearScreen(1.0); // 100% 伤害

    T.assertEqual(boss.hp, 0, 'HP 应降至 0');
    T.assertFalse(boss.alive, 'Boss 应死亡');
    T.assertEqual(result.damageDealt, 300, '100%伤害应等于最大HP');
})();

(function() {
    // 测试清屏伤害百分比计算
    var boss = new Boss(2); // maxHp = 450
    boss.y = boss.targetY;
    boss.entering = false;

    var result = boss.onClearScreen(0.2);
    T.assertEqual(result.damageDealt, 90, '20%伤害应为 90 (450*0.2)');
    T.assertEqual(boss.hp, 360, '剩余HP应为 360');
})();

(function() {
    // 测试眩晕状态检查
    var boss = new Boss(1);
    boss.y = boss.targetY;
    boss.entering = false;
    boss.onClearScreen(0.15);

    T.assertTrue(boss.isStunnedNow(), '清屏后应立即处于眩晕状态');

    // 模拟眩晕时间结束
    boss.stunTimer = 0;
    boss.isStunned = false;
    T.assertFalse(boss.isStunnedNow(), '眩晕结束后不应再处于眩晕状态');
})();

(function() {
    // 测试眩晕期间 Boss 不执行动作
    var boss = new Boss(1);
    boss.y = boss.targetY;
    boss.entering = false;
    boss.onClearScreen(0.15);

    var xBefore = boss.x;
    var yBefore = boss.y;
    var player = createMockPlayer();

    boss.update(1.0, player); // 模拟 1 秒更新

    T.assertEqual(boss.x, xBefore, '眩晕期间 x 不应移动');
    T.assertEqual(boss.y, yBefore, '眩晕期间 y 不应移动');
    T.assertTrue(boss.isStunned, '仍应处于眩晕状态');
    // 眩晕计时器减少
    T.assertTrue(boss.stunTimer < 1.5, '眩晕计时器应减少');
})();

// ============================================================
//  测试套件 4: 伤害计算 (takeDamage)
// ============================================================

T.suite('4. 伤害计算 (takeDamage)');

(function() {
    var boss = new Boss(1);
    boss.y = boss.targetY;
    boss.entering = false;

    var killed = boss.takeDamage(50);
    T.assertFalse(killed, '50点伤害不应击杀 Boss');
    T.assertEqual(boss.hp, 250, 'HP 应为 250 (300-50)');

    killed = boss.takeDamage(200);
    T.assertFalse(killed, '200点伤害不应击杀 Boss');
    T.assertEqual(boss.hp, 50, 'HP 应为 50');

    killed = boss.takeDamage(100);
    T.assertTrue(killed, '应击杀 Boss');
    T.assertEqual(boss.hp, 0, 'HP 应为 0');
    T.assertFalse(boss.alive, 'Boss 应死亡');
})();

(function() {
    // 测试过量伤害
    var boss = new Boss(1);
    var killed = boss.takeDamage(9999);
    T.assertTrue(killed, '过量伤害应击杀 Boss');
    T.assertEqual(boss.hp, 0, 'HP 不应为负数');
})();

// ============================================================
//  测试套件 5: 阶段切换 (enterPhase)
// ============================================================

T.suite('5. 阶段切换 (enterPhase)');

(function() {
    var mockGame = createMockGame();
    var boss = new Boss(1, { gameRef: mockGame });

    boss.enterPhase(2);
    T.assertEqual(boss.phase, 2, '阶段应切换为 2');
    T.assertTrue(boss.phaseTransitioning, '应处于阶段切换过渡中');
    T.assertEqual(boss.patternIndex, 0, '弹幕模式索引应重置为 0');
    T.assertEqual(boss.patternTimer, 0, '弹幕计时器应重置');
})();

(function() {
    // 测试阶段切换时清空敌方子弹
    var mockGame = createMockGame();
    mockGame.enemyBullets.push({ alive: true });
    mockGame.enemyBullets.push({ alive: true });

    var boss = new Boss(1, { gameRef: mockGame });
    boss.enterPhase(2);

    T.assertEqual(mockGame.enemyBullets.length, 2, '子弹数组长度不变');
    T.assertFalse(mockGame.enemyBullets[0].alive, '子弹应被标记为死亡');
    T.assertFalse(mockGame.enemyBullets[1].alive, '子弹应被标记为死亡');
})();

(function() {
    // 测试阶段切换过渡结束
    var boss = new Boss(1);
    boss.enterPhase(2);
    boss.update(1.5, createMockPlayer());
    T.assertFalse(boss.phaseTransitioning, '1.5秒后过渡应结束');
})();

(function() {
    // 测试自动阶段切换
    var boss = new Boss(1);
    boss.y = boss.targetY;
    boss.entering = false;
    boss.hp = boss.maxHp * 0.5; // 50% HP - 低于 60% 阈值

    boss.update(0.1, createMockPlayer());
    T.assertEqual(boss.phase, 2, 'HP低于60%应自动进入阶段2');
})();

// ============================================================
//  测试套件 6: 弹幕模式
// ============================================================

T.suite('6. 弹幕模式');

(function() {
    var mockGame = createMockGame();
    var mockPool = createMockBulletPool();
    var boss = new Boss(1, { gameRef: mockGame, bulletPoolRef: mockPool });
    boss.y = boss.targetY;
    boss.entering = false;

    var bulletCountBefore = mockGame.enemyBullets.length;
    var player = createMockPlayer();
    boss.firePattern(player);

    T.assertTrue(mockGame.enemyBullets.length > bulletCountBefore, '弹幕应产生子弹');
    T.assertEqual(mockGame.enemyBullets[0].owner, 'boss', '子弹 owner 应为 boss');
    T.assertEqual(mockGame.enemyBullets[0].damage, boss.damage, '子弹伤害应与 Boss 一致');
})();

(function() {
    // 测试 _patCount 各阶段返回值
    var boss = new Boss(1);
    T.assertEqual(boss._patCount(), 2, '阶段1应有2种弹幕模式');

    boss.phase = 2;
    T.assertEqual(boss._patCount(), 3, '阶段2应有3种弹幕模式');

    boss.phase = 3;
    T.assertEqual(boss._patCount(), 4, '阶段3应有4种弹幕模式');
})();

(function() {
    // 测试玩家死亡时不发射弹幕
    var mockGame = createMockGame();
    var boss = new Boss(1, { gameRef: mockGame });
    boss.y = boss.targetY;
    boss.entering = false;

    var deadPlayer = createMockPlayer(false);
    boss.firePattern(deadPlayer);
    T.assertEqual(mockGame.enemyBullets.length, 0, '玩家死亡时不应发射弹幕');
})();

// ============================================================
//  测试套件 7: 入场动画
// ============================================================

T.suite('7. 入场动画');

(function() {
    var boss = new Boss(1);
    var startY = boss.y;

    boss.update(0.5, createMockPlayer());
    T.assertTrue(boss.y > startY, '入场时 y 应增加');
    T.assertTrue(boss.entering, '应仍处于入场状态');

    // 模拟入场完成
    boss.y = boss.targetY;
    boss.update(0.1, createMockPlayer());
    T.assertFalse(boss.entering, '到达目标位置后应结束入场');
    T.assertEqual(boss.y, boss.targetY, 'y 应为 targetY');
})();

// ============================================================
//  测试套件 8: 依赖注入
// ============================================================

T.suite('8. 依赖注入');

(function() {
    var mockGame = createMockGame();
    var mockAudio = createMockAudio();
    var mockPool = createMockBulletPool();

    var boss = new Boss(1, {
        gameRef: mockGame,
        audioRef: mockAudio,
        bulletPoolRef: mockPool
    });

    T.assertEqual(boss._getGame(), mockGame, 'gameRef 应正确注入');
    T.assertEqual(boss._getAudio(), mockAudio, 'audioRef 应正确注入');
    T.assertEqual(boss._getBulletPool(), mockPool, 'bulletPoolRef 应正确注入');
})();

(function() {
    // 测试无依赖注入时回退到全局变量
    var boss = new Boss(1);
    // 不应抛出异常
    var game = boss._getGame();
    var audio = boss._getAudio();
    var pool = boss._getBulletPool();
    T.assert(true, '无依赖注入时不应抛出异常');
})();

// ============================================================
//  测试套件 9: 综合场景 - 投降后清屏
// ============================================================

T.suite('9. 综合场景');

(function() {
    // 场景：先投降再清屏 - 验证状态独立
    var boss = new Boss(1);
    boss.y = boss.targetY;
    boss.entering = false;

    // 触发投降
    var surrenderResult = boss.onPlayerSurrender();
    T.assertTrue(boss.surrenderReaction, '投降反应应触发');
    T.assertEqual(boss.reactionColor, '#ffcc00', '投降反应颜色应为金色');

    // 重置状态后触发清屏
    boss.reactionMessage = '';
    boss.reactionTimer = 0;
    boss.reactionColor = '';
    boss.flashTimer = 0;

    var clearResult = boss.onClearScreen(0.15);
    T.assertTrue(boss.isStunned, '清屏后应眩晕');
    T.assertEqual(boss.reactionColor, '#ff3333', '清屏反应颜色应为红色');
    T.assertTrue(boss.surrenderReaction, 'surrenderReaction 应保持为 true');
})();

(function() {
    // 场景：Boss 被清屏击杀
    var boss = new Boss(1);
    boss.y = boss.targetY;
    boss.entering = false;

    var result = boss.onClearScreen(1.0);
    T.assertFalse(boss.alive, 'Boss 应死亡');
    T.assertEqual(boss.hp, 0, 'HP 应为 0');

    // 死亡后不应再响应投降
    var surrenderResult = boss.onPlayerSurrender();
    T.assertEqual(surrenderResult, null, '死亡 Boss 不应响应投降');
})();

// ============================================================
//  测试套件 10: 边界条件
// ============================================================

T.suite('10. 边界条件');

(function() {
    // 测试清屏伤害为 0
    var boss = new Boss(1);
    boss.y = boss.targetY;
    boss.entering = false;
    var hpBefore = boss.hp;

    var result = boss.onClearScreen(0);
    T.assertEqual(result.damageDealt, 0, '0%伤害应为0');
    T.assertEqual(boss.hp, hpBefore, 'HP 不应变化');
    T.assertTrue(boss.isStunned, '即使0伤害也应眩晕');
})();

(function() {
    // 测试连续清屏
    var boss = new Boss(3); // 600 HP
    boss.y = boss.targetY;
    boss.entering = false;

    boss.onClearScreen(0.15); // 90 damage
    boss.isStunned = false; // 手动解除眩晕
    boss.stunTimer = 0;
    boss.onClearScreen(0.15); // 90 damage
    T.assertEqual(boss.hp, 420, '两次15%清屏后HP应为420');
})();

(function() {
    // 测试反应消息计时器
    var boss = new Boss(1);
    boss.y = boss.targetY;
    boss.entering = false;

    boss.onPlayerSurrender();
    boss.update(4.0, createMockPlayer());
    T.assertTrue(boss.reactionTimer <= 0, '4秒后反应消息应消失');
})();

// ============================================================
//  输出测试结果
// ============================================================

T.summary();

// 如果在浏览器中运行，将结果输出到页面
if (typeof document !== 'undefined') {
    var resultDiv = document.createElement('div');
    resultDiv.style.cssText = 'position:fixed;bottom:10px;right:10px;background:rgba(0,0,0,0.9);color:#0f0;padding:16px;font-family:monospace;font-size:12px;z-index:9999;border-radius:8px;max-height:300px;overflow-y:auto;';
    resultDiv.innerHTML = '<strong>Boss 单元测试</strong><br>' +
        '通过: ' + T.passed + '/' + T.total + '<br>' +
        (T.failed > 0 ? '<span style="color:#f00">失败: ' + T.failed + '</span>' : '<span style="color:#0f0">全部通过！</span>');
    document.body.appendChild(resultDiv);
}