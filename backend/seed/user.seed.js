const UserRepository = require('../repositories/UserRepository');
const bcrypt = require('bcryptjs');
const { ROLES, ROLE_DESCRIPTIONS } = require('../constants/accessControl');

module.exports = async () => {
    console.log('Iniciando seed de usuários...');
    
    const senhaUser = await bcrypt.hash('147', 10);
    const senhaAdmin = await bcrypt.hash('258', 10);

    //Criação de usuário comum
    await UserRepository.createWithRoles({
        username: 'Gui Ribeiro',
        email: "guilherme@gmail.com",
        password: senhaUser
    }, [ROLES.CITIZEN], ROLE_DESCRIPTIONS);
        
    //Criação de usuário administrador
    await UserRepository.createWithRoles({
        username: 'Ana Bispo',
        email: "ana@gmail.com",
        password: senhaAdmin
    }, [ROLES.CITIZEN, ROLES.ADMIN], ROLE_DESCRIPTIONS);

    console.log('Seed de usuários concluída.');
}
