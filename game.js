class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 40;
        this.map = null;
        this.player = null;
        this.floor = 1;
        this.maxFloor = 10; // 设置最大楼层为10
        this.isGameOver = false;
        this.message = '';
        this.messageTimer = 0;
    }

    init() {
        this.player = new Player();
        this.player.showSkillTooltip(); // 显示首次启动技能提示
        this.generateMap();
        this.updateUI();
        this.bindEvents();
        this.gameLoop();
    }

    generateMap() {
        this.map = new Map(this.floor);
        // 确保玩家出生点不被阻挡
        this.player.x = 1;
        this.player.y = 1;
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
                    }
                }

                // 减少技能冷却
                this.player.reduceCooldowns();
                this.updateSkillUI();
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
                    frontEnemy.hp -= damage > 0 ? damage : 1;
                    this.showMessage(`使用双倍伤害技能，对${frontEnemy.name}造成${damage > 0 ? damage : 1}点伤害`);

                    // 检查敌人是否死亡
                    if (frontEnemy.hp <= 0) {
                        this.showMessage(`击败了${frontEnemy.name}，获得${frontEnemy.exp}点经验`);
                        this.player.gainExp(frontEnemy.exp);
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
        // 玩家攻击敌人
        const playerDamage = Math.max(1, this.player.attack - enemy.defense);
        enemy.hp -= playerDamage;
        this.showMessage(`对${enemy.name}造成${playerDamage}点伤害`);

        // 检查敌人是否死亡
        if (enemy.hp <= 0) {
            this.showMessage(`击败了${enemy.name}，获得${enemy.exp}点经验`);
            this.player.gainExp(enemy.exp);
            this.map.enemies.splice(enemyIndex, 1);
        } else {
            // 敌人反击
            const enemyDamage = Math.max(1, enemy.attack - this.player.defense);
            this.player.takeDamage(enemyDamage);
            this.showMessage(`${enemy.name}对你造成${enemyDamage}点伤害`);

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
        item.effect(this.player);
        this.showMessage(`获得了${item.name}`);
        this.map.items.splice(itemIndex, 1);
    }

    changeFloor() {
        this.floor++;
        if (this.floor > this.maxFloor) {
            this.gameOver(true);
            return;
        }
        this.showMessage(`进入第${this.floor}层`);
        this.generateMap();
    }

    gameOver(isVictory) {
        this.isGameOver = true;
        if (isVictory) {
            this.showMessage("恭喜你通关了！");
        } else {
            this.showMessage("游戏结束，你失败了！");
        }
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
        });

        // 绘制玩家
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(this.player.x * this.tileSize, this.player.y * this.tileSize, this.tileSize, this.tileSize);
        this.ctx.strokeStyle = '#000';
        this.ctx.strokeRect(this.player.x * this.tileSize, this.player.y * this.tileSize, this.tileSize, this.tileSize);

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
    }

    gameLoop() {
        if (!this.isGameOver) {
            this.updateUI();
            this.render();
        }
        requestAnimationFrame(() => this.gameLoop());
    }
}