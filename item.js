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
        const before = player.hp;
        player.hp = Math.min(player.maxHp, player.hp + 50);
        const healed = player.hp - before;
        return `生命+${healed}`;
    }, 'H', '#FF6B6B');
}

function createAttackPotion(x, y) {
    return new Item(x, y, '攻击药水', (player) => {
        player.attack += 5;
        return '攻击+5';
    }, 'A', '#FFD166');
}

function createDefensePotion(x, y) {
    return new Item(x, y, '防御药水', (player) => {
        player.defense += 3;
        return '防御+3';
    }, 'D', '#06D6A0');
}

function createKey(x, y) {
    return new Item(x, y, '钥匙', (player) => {
        player.keys++;
        return '获得钥匙×1';
    }, 'K', '#BB8FCE');
}

function createGold(x, y) {
    return new Item(x, y, '金币', (player) => {
        player.gold += 20;
        return '+20金币';
    }, 'G', '#F1C40F');
}

function createPrincess(x, y) {
    return new Item(x, y, '公主', (player) => {
        // 公主的效果是完成游戏
        player.hasRescuedPrincess = true;
        return '救出了公主！';
    }, '♀', '#FFB6C1');
}