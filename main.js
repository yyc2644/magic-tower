// 确保DOM加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});