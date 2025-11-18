const LikeRepository = require('../repositories/LikeRepository');

module.exports = async () => {
    console.log('Iniciando seed de likes...');

    //Criação de like de exemplo
    await LikeRepository.create({
        userId: 2,
        denunciaId: 1
    });

    console.log('Seed de likes concluída.');
}