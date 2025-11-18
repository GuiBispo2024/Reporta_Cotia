const UserRepository = require('../repositories/UserRepository');
const bcrypt = require('bcrypt');

module.exports = async () => {
    console.log('Iniciando seed de usuários...');
    
    const senhaUser = await bcrypt.hash('147', 10);
    const senhaAdmin = await bcrypt.hash('258', 10);

    //Criação de usuário comum
    await UserRepository.create({
        username: 'user',
        email: "",
        password: senhaUser,
        adm: false
    });
        
    //Criação de usuário administrador
    await UserRepository.create({
        username: 'admin',
        email: "",
        password: senhaAdmin,
        adm: true
    });

    console.log('Seed de usuários concluída.');
}
