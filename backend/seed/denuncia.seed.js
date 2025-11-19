const DenunciaRepository = require('../repositories/DenunciaRepository')
const UserRepository = require('../repositories/UserRepository');

module.exports = async () => {
    console.log('Iniciando seed de denúncias...');

    const users = await UserRepository.findAll();

    if (users.length < 2) {
        throw new Error("É necessário ter pelo menos 2 usuários antes da seed de denúncias!");
    }

    //Criação de denúncias de exemplo
    await DenunciaRepository.create({
        titulo: "Buraco na rua",
        localizacao: "Rua das laranjas",
        descricao: "Buraco perigoso, dificulta a passagem de veículos",
        userId: users[0].id
    });

    //Criação de outra denúncia de exemplo
    await DenunciaRepository.create({
        titulo: "Luz queimada no poste",
        localizacao: "Rua 22",
        descricao: "Poste sem luz, área totalmente escura à noite",
        status: "aprovada",
        userId: users[1].id
    });

    console.log('Seed de denúncias concluída.');
}