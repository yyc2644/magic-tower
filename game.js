class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        // 基于屏幕宽度动态设定tileSize（在init里再精调）
        this.tileSize = 40;
        this.map = null;
        this.player = null;
        this.floor = 1;
        this.maxFloor = 10; // 设置最大楼层为10
        this.isGameOver = false;
        this.message = '';
        this.messageTimer = 0;
        this.victoryScreen = document.getElementById('victory-screen');
        this.restartBtn = document.getElementById('restart-game');
        this.isSecondPlaythrough = false; // 标记是否为二次进入
        this.hasDefeatedBoss = false; // 添加是否击败魔王的标记
        // 特效：伤害飘字与受击闪烁
        this.effects = []; // {x,y,text,color,alpha,vy,life}
    }

    init() {
        this.player = new Player();
        this.player.showSkillTooltip(); // 显示首次启动技能提示
        this.updateResponsiveTileSize();
        this.generateMap();
        this.updateUI();
        this.bindEvents();
        // 监听窗口尺寸变化，做自适应
        window.addEventListener('resize', () => {
            this.updateResponsiveTileSize();
            this.resizeCanvasToMap();
            this.render();
        });
        this.gameLoop();
    }

    generateMap() {
        // 传递二次进入标志给 Map 构造函数
        this.map = new Map(this.floor, this.isSecondPlaythrough);
        this.resizeCanvasToMap();
        // 确保玩家出生点不被阻挡
        this.player.x = 1;
        this.player.y = 1;
    }

    // 根据屏幕宽度动态设置tileSize，确保在手机端也能完整显示
    updateResponsiveTileSize() {
        const maxCanvasWidth = Math.min(window.innerWidth - 24, 800); // 留出边距
        // 预估地图宽度，以初始或当前地图的宽度为准
        const mapWidth = this.map ? this.map.width : 10;
        const size = Math.floor(maxCanvasWidth / mapWidth);
        // 约束tileSize范围
        this.tileSize = Math.max(24, Math.min(48, size));
    }

    resizeCanvasToMap() {
        this.canvas.width = this.map.width * this.tileSize;
        this.canvas.height = this.map.height * this.tileSize;
        this.canvas.style.width = `${this.canvas.width}px`;
        this.canvas.style.height = `${this.canvas.height}px`;
    }

    bindEvents() {
        // 方向键控制
        document.getElementById('up').addEventListener('click', () => this.movePlayer('up'));
        document.getElementById('down').addEventListener('click', () => this.movePlayer('down'));
        document.getElementById('left').addEventListener('click', () => this.movePlayer('left'));
        document.getElementById('right').addEventListener('click', () => this.movePlayer('right'));

        // 技能1控制
        document.getElementById('skill1').addEventListener('click', () => this.useSkill(1));

        // 键盘控制
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowUp':
                    this.movePlayer('up');
                    break;
                case 'ArrowDown':
                    this.movePlayer('down');
                    break;
                case 'ArrowLeft':
                    this.movePlayer('left');
                    break;
                case 'ArrowRight':
                    this.movePlayer('right');
                    break;
                case '1':
                    this.useSkill(1);
                    break;
            }
        });

        // 添加重新开始游戏的事件监听
        this.restartBtn.addEventListener('click', () => this.restartGame());
    }

    movePlayer(direction) {
        if (this.isGameOver) return;

        this.player.direction = direction;
        let newX = this.player.x;
        let newY = this.player.y;

        switch (direction) {
            case 'up':
                newY--;
                break;
            case 'down':
                newY++;
                break;
            case 'left':
                newX--;
                break;
            case 'right':
                newX++;
                break;
        }

        // 检查是否可以移动
        if (this.map.isWalkable(newX, newY)) {
            // 检查是否有敌人
            const enemyIndex = this.map.enemies.findIndex(e => e.x === newX && e.y === newY);
            if (enemyIndex !== -1) {
                // 战斗
                this.battle(enemyIndex);
            } else {
                // 检查是否有物品
                const itemIndex = this.map.items.findIndex(i => i.x === newX && i.y === newY);
                if (itemIndex !== -1) {
                    this.pickupItem(itemIndex);
                }

                // 检查是否是楼梯
                if (this.map.isStair(newX, newY)) {
                    this.changeFloor();
                } else {
                    // 移动玩家
                    this.player.x = newX;
                    this.player.y = newY;

                    // 尝试被动技能回血
                    const healAmount = this.player.tryPassiveHeal();
                    if (healAmount > 0) {
                        this.showMessage(`被动技能触发：回复${healAmount}点生命`);
                        this.addFloater(this.player.x, this.player.y, `+${healAmount}`, '#3CCB6C');
                    }
                }

                // 减少技能冷却
                this.player.reduceCooldowns();
                this.updateSkillUI();

                // 敌人回合：玩家移动或拾取后，敌人各移动一次，并尝试相邻攻击
                this.enemyTurn();
            }

            this.updateUI();
            this.render();
        }
    }

    useSkill(skillId) {
        if (this.isGameOver) return;

        if (skillId === 1) {
            if (this.player.useSkill(1)) {
                const frontEnemy = this.getFrontEnemy();
                if (frontEnemy) {
                    // 技能1效果：双倍伤害
                    const damage = this.player.attack * 2 - frontEnemy.defense;
                    const final = damage > 0 ? damage : 1;
                    frontEnemy.hp -= final;
                    this.showMessage(`使用双倍伤害技能，对${frontEnemy.name}造成${final}点伤害`);
                    this.addFloater(frontEnemy.x, frontEnemy.y, `-${final}`, '#FF5555');
                    this.triggerFlash(frontEnemy);

                    // 检查敌人是否死亡
                    if (frontEnemy.hp <= 0) {
                        this.showMessage(`击败了${frontEnemy.name}，获得${frontEnemy.exp}点经验`);
                        this.player.gainExp(frontEnemy.exp);
                        this.addFloater(frontEnemy.x, frontEnemy.y, `EXP+${frontEnemy.exp}`, '#FFD700');
                        this.map.enemies.splice(this.map.enemies.indexOf(frontEnemy), 1);
                    }

                    this.updateSkillUI();
                    this.updateUI();
                    this.render();
                } else {
                    this.showMessage("前方没有敌人");
                    // 取消技能冷却
                    this.player.skills.skill1.currentCooldown = 0;
                }
            } else {
                this.showMessage(`技能冷却中，还剩${this.player.skills.skill1.currentCooldown}回合`);
            }
        }
    }

    getFrontEnemy() {
        // 根据玩家当前朝向获取前方敌人
        let enemy = null;
        switch (this.player.direction) {
            case 'up':
                enemy = this.map.enemies.find(e => e.x === this.player.x && e.y === this.player.y - 1);
                break;
            case 'down':
                enemy = this.map.enemies.find(e => e.x === this.player.x && e.y === this.player.y + 1);
                break;
            case 'left':
                enemy = this.map.enemies.find(e => e.x === this.player.x - 1 && e.y === this.player.y);
                break;
            case 'right':
                enemy = this.map.enemies.find(e => e.x === this.player.x + 1 && e.y === this.player.y);
                break;
        }
        return enemy;
    }

    battle(enemyIndex) {
        const enemy = this.map.enemies[enemyIndex];
        // 玩家攻击敌人（在此完成减防计算，传递最终伤害给表现层）
        const playerDamage = Math.max(1, this.player.attack - enemy.defense);
        enemy.hp -= playerDamage;
        this.showMessage(`对${enemy.name}造成${playerDamage}点伤害`);
        this.addFloater(enemy.x, enemy.y, `-${playerDamage}`, '#FF5555');
        this.triggerFlash(enemy);

        // 检查敌人是否死亡
        if (enemy.hp <= 0) {
            this.showMessage(`击败了${enemy.name}，获得${enemy.exp}点经验`);
            this.player.gainExp(enemy.exp);
            this.addFloater(enemy.x, enemy.y, `EXP+${enemy.exp}`, '#FFD700');

            // 如果击败的是魔王
            if (enemy.isBoss) {
                this.hasDefeatedBoss = true;
                this.showMessage('恭喜你击败了魔王！');
                // 在魔王位置生成公主
                this.map.generatePrincess();
                // 移除楼梯，防止提前离开
                const stairX = this.map.width - 2;
                const stairY = this.map.height - 2;
                this.map.tiles[stairY][stairX] = { type: 'wall', color: '#888' };
            }

            this.map.enemies.splice(enemyIndex, 1);
        } else {
            // 敌人反击（计算最终伤害后再交给takeDamage，不再二次扣防）
            const enemyDamage = Math.max(1, enemy.attack - this.player.defense);
            this.player.takeDamage(enemyDamage);
            this.showMessage(`${enemy.name}对你造成${enemyDamage}点伤害`);
            this.addFloater(this.player.x, this.player.y, `-${enemyDamage}`, '#FF7777');
            this.triggerFlash(this.player);

            // 检查玩家是否死亡
            if (this.player.hp <= 0) {
                this.gameOver(false);
            }
        }

        // 减少技能冷却
        this.player.reduceCooldowns();
        this.updateSkillUI();
    }

    pickupItem(itemIndex) {
        const item = this.map.items[itemIndex];
        const effectMessage = item.effect(this.player);
        this.showMessage(`获得了${item.name}${effectMessage ? '，' + effectMessage : ''}`);
        if (effectMessage) {
            this.addFloater(this.player.x, this.player.y, effectMessage, '#3CCB6C');
        }

        // 如果拾取的是公主
        if (item.name === '公主') {
            this.gameOver(true);
        }

        this.map.items.splice(itemIndex, 1);
    }

    changeFloor() {
        this.floor++;
        if (this.floor > this.maxFloor) {
            // 只有击败魔王并救出公主才能通关
            if (this.hasDefeatedBoss && this.player.hasRescuedPrincess) {
                this.gameOver(true);
            } else {
                this.showMessage('你必须击败魔王并救出公主才能通关！');
                this.floor--;
            }
            return;
        }
        this.showMessage(`进入第${this.floor}层`);
        this.generateMap();
    }

    gameOver(isVictory) {
        this.isGameOver = true;
        if (isVictory) {
            // 根据是否救出公主显示不同的通关信息
            const victoryMessage = this.player.hasRescuedPrincess ? 
                '恭喜你击败了魔王并救出了公主！游戏通关！' : 
                '恭喜你到达了塔顶！但请击败魔王并救出公主以完成游戏。';

            // 显示通关提示界面
            this.victoryScreen.style.display = 'flex';
            this.victoryScreen.querySelector('.victory-message').textContent = victoryMessage;

            // 添加动画效果
            setTimeout(() => {
                const messageEl = this.victoryScreen.querySelector('.victory-message');
                messageEl.style.transform = 'scale(1.2)';
                messageEl.style.transition = 'transform 0.3s ease-in-out';
                setTimeout(() => {
                    messageEl.style.transform = 'scale(1)';
                }, 300);
            }, 500);

            // 通关后设置二次进入标志
            this.isSecondPlaythrough = true;
        } else {
            this.showMessage("游戏结束，你失败了！");
            // 为失败也添加更醒目的提示
            const messageEl = document.getElementById('message');
            messageEl.style.color = 'red';
            messageEl.style.fontSize = '18px';
            messageEl.style.fontWeight = 'bold';
            // 3秒后恢复正常样式
            setTimeout(() => {
                messageEl.style.color = '#333';
                messageEl.style.fontSize = '16px';
                messageEl.style.fontWeight = 'normal';
            }, 3000);
        }
    }

    // 添加重新开始游戏的方法
    restartGame() {
        this.victoryScreen.style.display = 'none';
        this.floor = 1;
        this.isGameOver = false;
        this.player = new Player();
        // 保留二次进入标志
        this.generateMap();
        this.updateUI();
        this.render();
    }

    showMessage(text) {
        this.message = text;
        this.messageTimer = 180; // 显示3秒（60帧/秒）
    }

    updateUI() {
        document.getElementById('level').textContent = this.player.level;
        document.getElementById('hp').textContent = this.player.hp;
        document.getElementById('maxHp').textContent = this.player.maxHp;
        document.getElementById('attack').textContent = this.player.attack;
        document.getElementById('defense').textContent = this.player.defense;
        document.getElementById('gold').textContent = this.player.gold;
        document.getElementById('keys').textContent = this.player.keys;
        document.getElementById('floor').textContent = this.floor;
        document.getElementById('maxFloor').textContent = this.maxFloor;

        if (this.messageTimer > 0) {
            document.getElementById('message').textContent = this.message;
            this.messageTimer--;
        } else {
            document.getElementById('message').textContent = '';
        }
    }

    updateSkillUI() {
        // 更新技能1冷却显示
        const skill1El = document.getElementById('skill1');
        const cooldownEl = skill1El.querySelector('.skill-cooldown');
        if (this.player.skills.skill1.currentCooldown > 0) {
            if (!cooldownEl) {
                const newCooldownEl = document.createElement('div');
                newCooldownEl.className = 'skill-cooldown';
                newCooldownEl.textContent = this.player.skills.skill1.currentCooldown;
                skill1El.appendChild(newCooldownEl);
            } else {
                cooldownEl.textContent = this.player.skills.skill1.currentCooldown;
            }
        } else if (cooldownEl) {
            cooldownEl.remove();
        }
    }

    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制地图
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                const tile = this.map.getTile(x, y);
                this.ctx.fillStyle = tile.color;
                this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
                this.ctx.strokeStyle = '#000';
                this.ctx.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);

                // 绘制特殊标记
                if (tile.type === 'stair') {
                    this.ctx.fillStyle = '#666';
                    this.ctx.font = '20px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText('↑', x * this.tileSize + this.tileSize / 2, y * this.tileSize + this.tileSize / 2);
                }
            }
        }

        // 绘制物品
        this.map.items.forEach(item => {
            this.ctx.fillStyle = item.color;
            this.ctx.fillRect(item.x * this.tileSize, item.y * this.tileSize, this.tileSize, this.tileSize);
            this.ctx.strokeStyle = '#000';
            this.ctx.strokeRect(item.x * this.tileSize, item.y * this.tileSize, this.tileSize, this.tileSize);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(item.symbol, item.x * this.tileSize + this.tileSize / 2, item.y * this.tileSize + this.tileSize / 2);
        });

        // 绘制敌人
        this.map.enemies.forEach(enemy => {
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(enemy.x * this.tileSize, enemy.y * this.tileSize, this.tileSize, this.tileSize);
            this.ctx.strokeStyle = '#000';
            this.ctx.strokeRect(enemy.x * this.tileSize, enemy.y * this.tileSize, this.tileSize, this.tileSize);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(enemy.name, enemy.x * this.tileSize + this.tileSize / 2, enemy.y * this.tileSize + this.tileSize / 2 - 8);
            this.ctx.fillText(`HP:${enemy.hp}`, enemy.x * this.tileSize + this.tileSize / 2, enemy.y * this.tileSize + this.tileSize / 2 + 8);

            // 受击闪烁覆盖
            if (enemy._flashFrames && enemy._flashFrames > 0) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.6;
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.fillRect(enemy.x * this.tileSize, enemy.y * this.tileSize, this.tileSize, this.tileSize);
                this.ctx.restore();
                enemy._flashFrames--;
            }
        });

        // 绘制玩家
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(this.player.x * this.tileSize, this.player.y * this.tileSize, this.tileSize, this.tileSize);
        this.ctx.strokeStyle = '#000';
        this.ctx.strokeRect(this.player.x * this.tileSize, this.player.y * this.tileSize, this.tileSize, this.tileSize);

        // 玩家受击闪烁
        if (this.player._flashFrames && this.player._flashFrames > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.6;
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(this.player.x * this.tileSize, this.player.y * this.tileSize, this.tileSize, this.tileSize);
            this.ctx.restore();
            this.player._flashFrames--;
        }

        // 绘制玩家方向
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        let directionSymbol = '↑';
        switch (this.player.direction) {
            case 'down':
                directionSymbol = '↓';
                break;
            case 'left':
                directionSymbol = '←';
                break;
            case 'right':
                directionSymbol = '→';
                break;
        }
        this.ctx.fillText(directionSymbol, this.player.x * this.tileSize + this.tileSize / 2, this.player.y * this.tileSize + this.tileSize / 2);

        // 绘制与更新飘字特效
        this.renderEffects();
    }

    gameLoop() {
        if (!this.isGameOver) {
            this.updateUI();
            this.render();
        }
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // 更新怪物
        this.map.enemies.forEach(enemy => {
            enemy.move(this.map, this.player);
            
            // 检查是否与玩家相邻
            if (Math.abs(enemy.x - this.player.x) + Math.abs(enemy.y - this.player.y) === 1) {
                const damage = Math.max(1, enemy.attack - this.player.defense);
                this.player.takeDamage(damage);
                this.showMessage(`敌人${enemy.name}对你造成了${damage}点伤害!`);
            }
        });
    }

    // 敌人回合（用于回合制：玩家行动后调用）
    enemyTurn() {
        if (this.isGameOver) return;
        this.map.enemies.forEach(enemy => {
            enemy.move(this.map, this.player);
            if (Math.abs(enemy.x - this.player.x) + Math.abs(enemy.y - this.player.y) === 1) {
                const damage = Math.max(1, enemy.attack - this.player.defense);
                this.player.takeDamage(damage);
                this.showMessage(`${enemy.name}对你造成${damage}点伤害`);
                this.addFloater(this.player.x, this.player.y, `-${damage}`, '#FF7777');
                this.triggerFlash(this.player);
                if (this.player.hp <= 0) {
                    this.gameOver(false);
                }
            }
        });
    }

    // 添加飘字
    addFloater(x, y, text, color) {
        this.effects.push({
            x: x * this.tileSize + this.tileSize / 2,
            y: y * this.tileSize + this.tileSize / 2,
            text,
            color: color || '#FFFFFF',
            alpha: 1,
            vy: -0.6,
            life: 50
        });
    }

    // 触发受击闪烁
    triggerFlash(entity) {
        if (entity) {
            entity._flashFrames = 8; // 约 ~8 帧闪白
        }
    }

    // 渲染与更新飘字
    renderEffects() {
        const next = [];
        for (let i = 0; i < this.effects.length; i++) {
            const fx = this.effects[i];
            // 绘制
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, fx.alpha);
            this.ctx.fillStyle = fx.color;
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(fx.text, fx.x, fx.y);
            this.ctx.restore();

            // 更新
            fx.y += fx.vy;
            fx.alpha -= 0.02;
            fx.life--;
            if (fx.life > 0 && fx.alpha > 0) next.push(fx);
        }
        this.effects = next;
    }
}