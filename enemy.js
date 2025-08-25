class Enemy {
    constructor(x, y, name, hp, attack, defense, exp, color) {
        this.x = x;
        this.y = y;
        this.name = name;
        this.hp = hp;
        this.attack = attack;
        this.defense = defense;
        this.exp = exp;
        this.color = color || '#8B0000';
    }
}