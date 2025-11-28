const LikeRepository = require('../repositories/LikeRepository');
const UserRepository = require('../repositories/UserRepository');
const DenunciaRepository = require('../repositories/DenunciaRepository');

module.exports = async () => {
    console.log('Iniciando seed de likes...');

    const users = await UserRepository.findAll();
    const denuncias = await DenunciaRepository.findAll();

    if (!users.length || !denuncias.length) {
        throw new Error("Users ou Denúncias não existem para gerar likes.");
    }

    //Criação de like de exemplo
    await LikeRepository.createOrFind({
        userId: users[0].id,
        denunciaId: denuncias[1].id
    });

    console.log('Seed de likes concluída.');
}