const CommentRepository = require('../repositories/CommentRepository');
const UserRepository = require('../repositories/UserRepository');
const DenunciaRepository = require('../repositories/DenunciaRepository');

module.exports = async () => {
    console.log('Iniciando seed de comentários...');

    const users = await UserRepository.findAll();
    const denuncias = await DenunciaRepository.findAll();

    if (!users.length || !denuncias.length) {
        throw new Error("Users ou Denúncias não existem para gerar comentários.");
    }

    await CommentRepository.create({
        comentario: "Nossa que perigo!",
        userId: users[0].id,
        denunciaId: denuncias[1].id
    });

    console.log('Seed de comentários concluída.');
}