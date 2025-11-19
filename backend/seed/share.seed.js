const ShareRepository = require('../repositories/ShareRepository');
const UserRepository = require('../repositories/UserRepository');
const DenunciaRepository = require('../repositories/DenunciaRepository');

module.exports = async () => {
    console.log('Iniciando seed de compartilhamentos...');

    const users = await UserRepository.findAll();
    const denuncias = await DenunciaRepository.findAll();

    if (!users.length || !denuncias.length) {
        throw new Error("Users ou Denúncias não existem para gerar shares.");
    }

    //Criação de compartilhamento de exemplo
    await ShareRepository.create({
        comentario: "Compartilhando para ajudar!",
        userId: users[0].id,
        denunciaId: denuncias[0].id
    })
    
    console.log('Seed de compartilhamentos concluída.');
}