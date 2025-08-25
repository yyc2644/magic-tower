class Map {
    constructor(floor) {
        this.width = 10;
        this.height = 10;
        this.tiles = [];
        this.enemies = [];
        this.items = [];
        this.floor = floor;
        this.generate();
    }

    generate() {
        // 初始化地图为墙
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = { type: 'wall', color: '#888' };
            }
        }

        // 生成房间和走廊（简化版）
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                // 70%概率生成地板
                if (Math.random() < 0.7) {
                    this.tiles[y][x] = { type: 'floor', color: '#CCC' };
                }
            }
        }

        // 确保出生点是地板
        this.tiles[1][1] = { type: 'floor', color: '#CCC' };

        // 放置楼梯
        const stairX = this.width - 2;
        const stairY = this.height - 2;
        this.tiles[stairY][stairX] = { type: 'stair', color: '#AAA' };

        // 根据楼层生成敌人
        const enemyCount = 3 + Math.floor(this.floor * 1.5);
        for (let i = 0; i < enemyCount; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * (this.width - 2)) + 1;
                y = Math.floor(Math.random() * (this.height - 2)) + 1;
            } while (!this.isWalkable(x, y) || (x === 1 && y === 1) || (x === stairX && y === stairY));

            const enemyHp = 30 + this.floor * 15;
            const enemyAttack = 5 + this.floor * 3;
            const enemyDefense = 2 + this.floor * 1;
            const enemyExp = 20 + this.floor * 10;

            this.enemies.push(new Enemy(x, y, `敌人${i+1}`, enemyHp, enemyAttack, enemyDefense, enemyExp));
        }

        // 生成物品
        const itemCount = 2 + Math.floor(Math.random() * 3);
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
}