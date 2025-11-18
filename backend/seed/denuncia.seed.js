const DenunciaRepository = require('../repositories/DenunciaRepository')

module.exports = async () => {
    console.log('Iniciando seed de denúncias...');

    //Criação de denúncias de exemplo
    await DenunciaRepository.create({
        titulo: "Buraco enorme na rua",
        localizacao: "Av Paulista",
        descricao: "Buraco perigoso",
        userId: 1
    });

    //Criação de outra denúncia de exemplo
    await DenunciaRepository.create({
        titulo: "Luz queimada no poste",
        localizacao: "Rua 22",
        descricao: "Poste sem luz",
        userId: 2
    });

    console.log('Seed de denúncias concluída.');
}