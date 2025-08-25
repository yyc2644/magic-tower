class Enemy {
    constructor(x, y, name, hp, attack, defense, exp, color) {
        this.x = x;
        this.y = y;
        this.name = name;
        this.hp = hp;
        this.maxHp = hp;
        this.attack = attack;
        this.defense = defense;
        this.exp = exp;
        this.color = color || '#8B0000';
        this.moveCooldown = 0;
        this.moveInterval = 30; // 每30帧移动一次
    }
    
    // 怪物移动逻辑
    move(map, player) {
        this.moveCooldown--;
        if (this.moveCooldown > 0) return false;
        
        this.moveCooldown = this.moveInterval;
        
        // 简单AI：向玩家方向移动
        const dx = Math.sign(player.x - this.x);
        const dy = Math.sign(player.y - this.y);
        
        // 随机选择横向或纵向移动
        if (Math.random() < 0.5 && dx !== 0) {
            const newX = this.x + dx;
            if (map.isWalkable(newX, this.y) && !map.hasEnemy(newX, this.y)) {
                this.x = newX;
                return true;
            }
        }
        
        if (dy !== 0) {
            const newY = this.y + dy;
            if (map.isWalkable(newY, this.x) && !map.hasEnemy(this.x, newY)) {
                this.y = newY;
                return true;
            }
        }
        
        // 如果无法向玩家移动，随机移动
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        shuffleArray(directions);
        
        for (const [dx, dy] of directions) {
            const newX = this.x + dx;
            const newY = this.y + dy;
            if (map.isWalkable(newX, newY) && !map.hasEnemy(newX, newY)) {
                this.x = newX;
                this.y = newY;
                return true;
            }
        }
        
        return false;
    }
    
    // 怪物攻击逻辑
    attack(player) {
        const damage = Math.max(1, this.attack - player.defense);
        player.takeDamage(damage);
        return damage;
    }
    
    // 怪物受伤逻辑
    takeDamage(damage) {
        this.hp = Math.max(0, this.hp - damage);
        return this.hp <= 0; // 返回是否被击败
    }
    
    // 绘制怪物
    draw(ctx, tileSize) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x * tileSize, this.y * tileSize, tileSize, tileSize);
        
        // 绘制怪物名称
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.fillText(this.name, this.x * tileSize, this.y * tileSize + 12);
        
        // 绘制怪物血量
        ctx.fillStyle = 'red';
        const healthBarWidth = tileSize * (this.hp / this.maxHp);
        ctx.fillRect(this.x * tileSize, this.y * tileSize + tileSize - 5, healthBarWidth, 5);
    }
}

// 辅助函数：随机打乱数组
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}