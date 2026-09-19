const bcrypt = require('bcryptjs');
const UserRepository = require('../repositories/UserRepository');
const { ROLES, ROLE_DESCRIPTIONS } = require('../constants/accessControl');

const accounts = [
  ['admin', 'Admin Demonstração', 'admin@reporta-cotia.example', ROLES.ADMIN],
  ['citizen', 'Morador Demonstração', 'morador@reporta-cotia.example', ROLES.CITIZEN],
  ['neighbor', 'Moradora Demonstração', 'moradora@reporta-cotia.example', ROLES.CITIZEN],
  ['moderator', 'Moderador Demonstração', 'moderador@reporta-cotia.example', ROLES.MODERATOR],
  ['analyst', 'Analista Demonstração', 'analista@reporta-cotia.example', ROLES.ANALYST]
];

module.exports = async () => {
  const users = {};
  const password = await bcrypt.hash('ReportaCotia123!', 10);
  for (const [key, username, email, role] of accounts) {
    let user = await UserRepository.findByEmail(email);
    if (!user) {
      user = await UserRepository.createWithRoles({ username, email, password },
        role === ROLES.ADMIN ? [ROLES.CITIZEN, ROLES.ADMIN] : [ROLES.CITIZEN], ROLE_DESCRIPTIONS);
      if (![ROLES.CITIZEN, ROLES.ADMIN].includes(role)) {
        await UserRepository.replaceRoles(user.id, [ROLES.CITIZEN, role], users.admin.id);
      }
    }
    // Não redefine senha nem perfis de contas já existentes.
    users[key] = user;
  }
  return users;
};
