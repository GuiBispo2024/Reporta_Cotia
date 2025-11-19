const UserRepository = require('../repositories/UserRepository');
const bcrypt = require('bcryptjs');

module.exports = async () => {
    console.log('Iniciando seed de usuários...');
    
    const senhaUser = await bcrypt.hash('147', 10);
    const senhaAdmin = await bcrypt.hash('258', 10);

    //Criação de usuário comum
    await UserRepository.create({
        username: 'Gui Ribeiro',
        email: "guilherme@gmail.com",
        password: senhaUser,
        adm: false
    });
        
    //Criação de usuário administrador
    await UserRepository.create({
        username: 'Ana Bispo',
        email: "ana@gmail.com",
        password: senhaAdmin,
        adm: true
    });

    console.log('Seed de usuários concluída.');
}
