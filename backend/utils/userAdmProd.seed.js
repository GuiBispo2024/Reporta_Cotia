const UserRepository = require('../repositories/UserRepository');
const bcrypt = require('bcryptjs');

module.exports = async () => {
    console.log('🔹 Verificando admin...');

    const adminEmail = "admin@gmail.com";

    // Verifica se já existe um administrador com esse email
    const existingAdmin = await UserRepository.findByEmail(adminEmail);

    if (existingAdmin) {
        console.log("✅ Admin já existe, nada a fazer.");
        return;
    }
    
    const senhaAdmin = await bcrypt.hash('258', 10);
    
    //Criação de usuário administrador
    await UserRepository.create({
        username: 'Administrador',
        email: adminEmail,
        password: senhaAdmin,
        adm: true
    });

    console.log("🌱 Seed de administrador criada com sucesso!");
}
