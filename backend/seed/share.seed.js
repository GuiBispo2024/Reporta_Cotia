const ShareRepository = require('../repositories/ShareRepository');

module.exports = async () => {
    console.log('Iniciando seed de compartilhamentos...');

    //Criação de compartilhamento de exemplo
    await ShareRepository.create({
        comentario: "Compartilhando para ajudar!",
        userId: 1,
        denunciaId: 1
    })
    
    console.log('Seed de compartilhamentos concluída.');
}