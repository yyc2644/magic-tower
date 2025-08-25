class Player {
    constructor() {
        this.x = 1;
        this.y = 1;
        this.level = 1;
        this.exp = 0;
        this.expToNextLevel = 100;
        this.maxHp = 100;
        this.hp = 100;
        this.attack = 10;
        this.defense = 5;
        this.gold = 0;
        this.keys = 0;
        this.direction = 'up'; // 默认朝向
        this.skills = {
            skill1: {
                name: "双倍伤害",
                description: "对面前单位造成2倍攻击伤害",
                cooldown: 5,
                currentCooldown: 0,
                isActive: true
            },
            skill2: {
                name: "生命恢复",
                description: "移动时有概率回复生命，概率和数值与玩家等级挂钩",
                isActive: true
            }
        };
    }

    gainExp(amount) {
        this.exp += amount;
        while (this.exp >= this.expToNextLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        this.exp -= this.expToNextLevel;
        this.level++;
        this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);
        this.maxHp += 20;
        this.hp = this.maxHp;
        this.attack += 5;
        this.defense += 3;
        console.log(`升级了！当前等级：${this.level}`);
    }

    takeDamage(damage) {
        const actualDamage = Math.max(1, damage - this.defense);
        this.hp = Math.max(0, this.hp - actualDamage);
        return actualDamage;
    }

    useSkill(skillId) {
        if (skillId === 1 && this.skills.skill1.currentCooldown === 0) {
            this.skills.skill1.currentCooldown = this.skills.skill1.cooldown;
            return true;
        }
        return false;
    }

    reduceCooldowns() {
        if (this.skills.skill1.currentCooldown > 0) {
            this.skills.skill1.currentCooldown--;
        }
    }

    tryPassiveHeal() {
        // 技能2：移动时有概率回血，概率和数值随等级提升
        const healChance = 0.1 + (this.level * 0.02); // 基础10%，每级+2%
        if (Math.random() <= healChance) {
            const healAmount = 5 + (this.level * 2); // 基础5点，每级+2点
            this.hp = Math.min(this.maxHp, this.hp + healAmount);
            return healAmount;
        }
        return 0;
    }

    showSkillTooltip() {
        // 首次启动游戏时显示技能提示
        if (!localStorage.getItem('skillTooltipShown')) {
            alert("技能说明：\n1. 主动技能[双倍伤害]：对面前单位造成2倍攻击伤害（冷却5回合）\n2. 被动技能[生命恢复]：移动时有概率回复生命，概率和数值随等级提升");
            localStorage.setItem('skillTooltipShown', 'true');
        }
    }
}