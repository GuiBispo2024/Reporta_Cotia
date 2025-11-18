const CommentRepository = require('../repositories/CommentRepository');

module.exports = async () => {
    console.log('Iniciando seed de comentários...');

    await CommentRepository.create({
        texto: "Concordo totalmente!",
        userId: 2,
        denunciaId: 1
    });

    console.log('Seed de comentários concluída.');
}