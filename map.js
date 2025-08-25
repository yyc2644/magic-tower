class Map {
    constructor(floor, isSecondPlaythrough = false) {
        // 根据是否二次进入设置不同的地图大小
        this.width = isSecondPlaythrough ? 16 : 10;
        this.height = isSecondPlaythrough ? 16 : 10;
        this.tiles = [];
        this.enemies = [];
        this.items = [];
        this.floor = floor;
        this.isSecondPlaythrough = isSecondPlaythrough;
        this.hasPrincess = false; // 添加是否有公主的标记
        this.generate();
    }

    generate() {
        // 1. 初始化地图为墙
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = { type: 'wall', color: '#888' };
            }
        }

        // 2. 生成连通路径 (BFS算法确保连通性)
        this.generateConnectedPath();

        // 3. 扩展路径生成房间
        this.expandRooms();

        // 4. 放置楼梯
        const stairX = this.width - 2;
        const stairY = this.height - 2;
        this.tiles[stairY][stairX] = { type: 'stair', color: '#AAA' };

        // 5. 根据是否二次进入和楼层生成敌人
        let enemyCount;
        if (this.floor === 10) {
            // 第10层(塔顶)只生成魔王
            this.generateBoss();
        } else if (this.isSecondPlaythrough) {
            // 二次进入时，怪物数量随机在3-6之间
            enemyCount = 3 + Math.floor(Math.random() * 4);
            this.generateRegularEnemies(enemyCount);
        } else {
            // 首次进入时，保持原有逻辑
            const baseEnemies = 2;
            const additionalEnemies = Math.min(Math.floor(this.floor / 2), 2);
            enemyCount = baseEnemies + additionalEnemies;
            this.generateRegularEnemies(enemyCount);
        }

        for (let i = 0; i < enemyCount; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * (this.width - 2)) + 1;
                y = Math.floor(Math.random() * (this.height - 2)) + 1;
            } while (!this.isWalkable(x, y) || (x === 1 && y === 1) || (x === stairX && y === stairY));

            // 二次进入时，怪物属性增强
            const enemyHp = this.isSecondPlaythrough ? 
                50 + this.floor * 20 : 
                30 + this.floor * 15;
            const enemyAttack = this.isSecondPlaythrough ? 
                8 + this.floor * 4 : 
                5 + this.floor * 3;
            const enemyDefense = this.isSecondPlaythrough ? 
                4 + this.floor * 2 : 
                2 + this.floor * 1;
            const enemyExp = this.isSecondPlaythrough ? 
                30 + this.floor * 15 : 
                20 + this.floor * 10;

            const enemyNames = ['骷髅', '僵尸', '幽灵', '巫师', '骑士', '恶魔', '龙'];
            const nameIndex = this.isSecondPlaythrough ? 
                Math.min(Math.floor(this.floor / 1.5), enemyNames.length - 1) : 
                Math.min(Math.floor(this.floor / 2), enemyNames.length - 1);
            const enemyName = enemyNames[nameIndex] + (i + 1);

            this.enemies.push(new Enemy(x, y, enemyName, enemyHp, enemyAttack, enemyDefense, enemyExp));
        }

        // 6. 生成物品
        // 二次进入时，物品数量也适当增加
        const itemCount = this.isSecondPlaythrough ? 
            5 + Math.floor(Math.random() * 4) : 
            3 + Math.floor(Math.random() * 3);

        for (let i = 0; i < itemCount; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * (this.width - 2)) + 1;
                y = Math.floor(Math.random() * (this.height - 2)) + 1;
            } while (!this.isWalkable(x, y) || this.hasEnemy(x, y) || (x === 1 && y === 1) || (x === stairX && y === stairY));

            const itemType = Math.floor(Math.random() * 5);
            switch (itemType) {
                case 0:
                    this.items.push(createHealthPotion(x, y));
                    break;
                case 1:
                    this.items.push(createAttackPotion(x, y));
                    break;
                case 2:
                    this.items.push(createDefensePotion(x, y));
                    break;
                case 3:
                    this.items.push(createKey(x, y));
                    break;
                case 4:
                    this.items.push(createGold(x, y));
                    break;
            }
        }
    }

    // 生成连通路径确保从起点到楼梯可达
    generateConnectedPath() {
        const startX = 1;
        const startY = 1;
        const endX = this.width - 2;
        const endY = this.height - 2;

        // 使用BFS生成路径
        const queue = [{ x: startX, y: startY }];
        const visited = new Set();
        visited.add(`${startX},${startY}`);
        this.tiles[startY][startX] = { type: 'floor', color: '#CCC' };

        const directions = [
            { dx: 0, dy: -1 }, // 上
            { dx: 0, dy: 1 },  // 下
            { dx: -1, dy: 0 }, // 左
            { dx: 1, dy: 0 }   // 右
        ];

        while (queue.length > 0) {
            const { x, y } = queue.shift();

            // 如果到达终点，停止BFS
            if (x === endX && y === endY) {
                break;
            }

            // 随机打乱方向，增加路径的随机性
            const shuffledDirections = [...directions].sort(() => Math.random() - 0.5);

            for (const { dx, dy } of shuffledDirections) {
                const newX = x + dx;
                const newY = y + dy;

                // 确保在边界内，并且没有访问过
                if (newX > 0 && newX < this.width - 1 && newY > 0 && newY < this.height - 1) {
                    const key = `${newX},${newY}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        this.tiles[newY][newX] = { type: 'floor', color: '#CCC' };
                        queue.push({ x: newX, y: newY });
                    }
                }
            }
        }

        // 确保终点是地板
        this.tiles[endY][endX] = { type: 'floor', color: '#CCC' };
    }

    // 扩展路径生成房间
    expandRooms() {
        // 对每个地板格子，有概率向四周扩展
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.tiles[y][x].type === 'floor') {
                    // 50%概率向四个方向扩展
                    const directions = [
                        { dx: 0, dy: -1 },
                        { dx: 0, dy: 1 },
                        { dx: -1, dy: 0 },
                        { dx: 1, dy: 0 }
                    ];

                    for (const { dx, dy } of directions) {
                        if (Math.random() < 0.5) {
                            const newX = x + dx;
                            const newY = y + dy;
                            if (newX > 0 && newX < this.width - 1 && newY > 0 && newY < this.height - 1) {
                                this.tiles[newY][newX] = { type: 'floor', color: '#CCC' };
                            }
                        }
                    }
                }
            }
        }

        // 二次扩展，增加房间大小
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.tiles[y][x].type === 'floor') {
                    // 30%概率向斜方向扩展
                    const directions = [
                        { dx: -1, dy: -1 },
                        { dx: -1, dy: 1 },
                        { dx: 1, dy: -1 },
                        { dx: 1, dy: 1 }
                    ];

                    for (const { dx, dy } of directions) {
                        if (Math.random() < 0.3) {
                            const newX = x + dx;
                            const newY = y + dy;
                            if (newX > 0 && newX < this.width - 1 && newY > 0 && newY < this.height - 1) {
                                this.tiles[newY][newX] = { type: 'floor', color: '#CCC' };
                            }
                        }
                    }
                }
            }
        }
    }

    getTile(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.tiles[y][x];
        }
        return { type: 'wall', color: '#888' };
    }

    isWalkable(x, y) {
        const tile = this.getTile(x, y);
        return tile.type === 'floor' || tile.type === 'stair';
    }

    isStair(x, y) {
        const tile = this.getTile(x, y);
        return tile.type === 'stair';
    }

    hasEnemy(x, y) {
        return this.enemies.some(enemy => enemy.x === x && enemy.y === y);
    }

    // 添加生成魔王的方法
    generateBoss() {
        // 魔王固定位置在地图中心
        const x = Math.floor(this.width / 2);
        const y = Math.floor(this.height / 2);

        // 确保魔王位置是可行走的
        this.tiles[y][x] = { type: 'floor', color: '#CCC' };

        // 魔王属性
        const bossHp = 500 + (this.isSecondPlaythrough ? 300 : 0);
        const bossAttack = 50 + (this.isSecondPlaythrough ? 30 : 0);
        const bossDefense = 20 + (this.isSecondPlaythrough ? 15 : 0);
        const bossExp = 1000;

        // 创建魔王
        this.enemies.push(new Enemy(x, y, '魔王', bossHp, bossAttack, bossDefense, bossExp, true));
    }

    // 添加生成普通敌人的方法
    generateRegularEnemies(count) {
        for (let i = 0; i < count; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * (this.width - 2)) + 1;
                y = Math.floor(Math.random() * (this.height - 2)) + 1;
            } while (!this.isWalkable(x, y) || (x === 1 && y === 1) || (x === this.width - 2 && y === this.height - 2));

            // 二次进入时，怪物属性增强
            const enemyHp = this.isSecondPlaythrough ? 
                50 + this.floor * 20 : 
                30 + this.floor * 15;
            const enemyAttack = this.isSecondPlaythrough ? 
                8 + this.floor * 4 : 
                5 + this.floor * 3;
            const enemyDefense = this.isSecondPlaythrough ? 
                4 + this.floor * 2 : 
                2 + this.floor * 1;
            const enemyExp = this.isSecondPlaythrough ? 
                30 + this.floor * 15 : 
                20 + this.floor * 10;

            const enemyNames = ['骷髅', '僵尸', '幽灵', '巫师', '骑士', '恶魔', '龙'];
            const nameIndex = this.isSecondPlaythrough ? 
                Math.min(Math.floor(this.floor / 1.5), enemyNames.length - 1) : 
                Math.min(Math.floor(this.floor / 2), enemyNames.length - 1);
            const enemyName = enemyNames[nameIndex] + (i + 1);

            this.enemies.push(new Enemy(x, y, enemyName, enemyHp, enemyAttack, enemyDefense, enemyExp));
        }
    }

    // 添加生成公主的方法
    generatePrincess() {
        if (this.floor === 10 && !this.hasPrincess) {
            // 公主位置在魔王原来的位置
            const x = Math.floor(this.width / 2);
            const y = Math.floor(this.height / 2);

            this.items.push(createPrincess(x, y));
            this.hasPrincess = true;
        }
    }
}