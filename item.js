class Item {
    constructor(x, y, name, effect, symbol, color) {
        this.x = x;
        this.y = y;
        this.name = name;
        this.effect = effect;
        this.symbol = symbol || '?';
        this.color = color || '#FFFF00';
    }
}

// 定义一些物品类型
function createHealthPotion(x, y) {
    return new Item(x, y, '生命药水', (player) => {
        player.hp = Math.min(player.maxHp, player.hp + 50);
    }, 'H', '#FF6B6B');
}

function createAttackPotion(x, y) {
    return new Item(x, y, '攻击药水', (player) => {
        player.attack += 5;
    }, 'A', '#FFD166');
}

function createDefensePotion(x, y) {
    return new Item(x, y, '防御药水', (player) => {
        player.defense += 3;
    }, 'D', '#06D6A0');
}

function createKey(x, y) {
    return new Item(x, y, '钥匙', (player) => {
        player.keys++;
    }, 'K', '#BB8FCE');
}

function createGold(x, y) {
    return new Item(x, y, '金币', (player) => {
        player.gold += 20;
    }, 'G', '#F1C40F');
}

function createPrincess(x, y) {
    return new Item(x, y, '公主', (player) => {
        // 公主的效果是完成游戏
        player.hasRescuedPrincess = true;
        return '救出了公主！';
    }, '♀', '#FFB6C1');
}