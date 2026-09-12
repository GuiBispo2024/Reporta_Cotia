const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const UserRepository = require('../repositories/UserRepository')
const { ROLES, ROLE_DESCRIPTIONS } = require('../constants/accessControl')
const { extractUserAccess } = require('../utils/userAccess')
const SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'reporta-cotia-test-secret' : undefined)
const { deleteImage } = require('../utils/upload')
const AppError = require('../utils/AppError')

function serializeAuthenticatedUser(user) {
  if (!user) return null

  const plain = user.get ? user.get({ plain: true }) : user
  const { roles, permissions } = extractUserAccess(plain)
  const {
    password: _password,
    tokenVersion: _tokenVersion,
    roles: _roleAssociations,
    ...safeUser
  } = plain

  return {
    ...safeUser,
    avatarUrl: safeUser.avatarUrl || null,
    roles,
    permissions
  }
}

class UserService {
    
  // Cadastrar usuário
  static async register({ username, email, password, avatarUrl = null }) {
    const existingEmail = await UserRepository.findByEmail(email)
    if (existingEmail) throw new Error('E-mail já cadastrado.')
    const existingUsername =  await UserRepository.findByUsername(username)
    if (existingUsername) throw new Error('Nome de usuário já cadastrado.')

    const hashed = await bcrypt.hash(password, 10)
    const created = await UserRepository.createWithRoles(
      { username, email, password: hashed, avatarUrl },
      [ROLES.CITIZEN],
      ROLE_DESCRIPTIONS
    )
    const plain = created.get ? created.get({ plain: true }) : created
    const { password: _password, tokenVersion: _tokenVersion, ...safeUser } = plain
    return safeUser
  }

  // Login
  static async login({ email, password }) {
    const user = await UserRepository.findByEmail(email)
    if (!user) throw new Error('Usuário não encontrado.')

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new Error('Senha incorreta.')

    const token = jwt.sign({ id: user.id, adm: user.adm, v: user.tokenVersion || 0 }, SECRET, { expiresIn: '30m' })
    const userWithAccess = await UserRepository.findByIdWithAccess(user.id)

    return {
      message: 'Login bem-sucedido',
      token,
      user: serializeAuthenticatedUser(userWithAccess)
    }
  }

  // Listar todos
  static async getAll() {
    return UserRepository.findAll()
  }

  //Lista todos os usuários com a contagem de denúncias feitas por cada um
  static async getAllWithDenunciaCount(isAdm = false, options = {}) {
    return UserRepository.findAllUsersWithDenuniaCount(isAdm, options);
  }

  // Buscar um usuário
  static async getById(id) {
    const user = await UserRepository.findPublicById(id)
    if (!user) throw new Error('Usuário não encontrado.')
    return user
  }

  static async getMe(id) {
    const user = await UserRepository.findByIdWithAccess(id)
    if (!user) throw new Error('Usuário não encontrado.')
    return serializeAuthenticatedUser(user)
  }

  static async getAvailableRoles() {
    const roles = await UserRepository.findRolesWithPermissions()
    return roles.map(role => {
      const plain = role.get ? role.get({ plain: true }) : role
      return {
        name: plain.name,
        description: plain.description,
        permissions: (plain.permissions || []).map(permission => ({
          key: permission.key,
          description: permission.description
        }))
      }
    })
  }

  static async updateRoles(targetUserId, requestedRoles, requesterId) {
    if (!Array.isArray(requestedRoles)) {
      throw new AppError('Informe os perfis do usuário em uma lista.', 400, 'INVALID_ROLES')
    }

    const validRoles = Object.values(ROLES)
    const normalizedRoles = [...new Set(requestedRoles.map(role => String(role).trim().toUpperCase()))]
    const invalidRoles = normalizedRoles.filter(role => !validRoles.includes(role))
    if (invalidRoles.length) {
      throw new AppError(`Perfil inválido: ${invalidRoles.join(', ')}.`, 400, 'INVALID_ROLES')
    }
    if (!normalizedRoles.includes(ROLES.CITIZEN)) normalizedRoles.unshift(ROLES.CITIZEN)

    const targetUser = await UserRepository.findByIdWithAccess(targetUserId)
    if (!targetUser) throw new AppError('Usuário não encontrado.', 404, 'USER_NOT_FOUND')

    const currentAccess = extractUserAccess(targetUser.get ? targetUser.get({ plain: true }) : targetUser)
    const removesAdmin = currentAccess.roles.includes(ROLES.ADMIN) && !normalizedRoles.includes(ROLES.ADMIN)
    if (Number(targetUserId) === Number(requesterId) && removesAdmin) {
      throw new AppError('Você não pode remover o perfil de administrador da própria conta.', 403, 'SELF_ADMIN_DEMOTION')
    }
    if (removesAdmin && await UserRepository.countUsersWithRole(ROLES.ADMIN) <= 1) {
      throw new AppError('Não é permitido remover o último administrador da plataforma.', 409, 'LAST_ADMIN_REQUIRED')
    }

    await UserRepository.replaceRoles(targetUserId, normalizedRoles)
    const updatedUser = await UserRepository.findByIdWithAccess(targetUserId)
    const plain = updatedUser.get ? updatedUser.get({ plain: true }) : updatedUser
    const { roles, permissions } = extractUserAccess(plain)

    return {
      message: 'Perfis do usuário atualizados com sucesso.',
      user: {
        id: plain.id,
        username: plain.username,
        email: plain.email,
        adm: plain.adm,
        avatarUrl: plain.avatarUrl || null,
        roles,
        permissions
      }
    }
  }

  // Atualizar
  static async update(data,userIdToken) {
    const userDb = await UserRepository.findById(userIdToken);
    if (!userDb) throw new Error("Usuário não encontrado.");
    const updates = {};
    if (typeof data.username === 'string' && data.username.trim()) updates.username = data.username.trim();
    if (typeof data.email === 'string' && data.email.trim()) updates.email = data.email.trim().toLowerCase();

    // --- TROCA DE SENHA ---
    if (data.senhaAtual || data.novaSenha) {

      if (!data.senhaAtual || !data.novaSenha) {
        throw new Error("Para trocar a senha, preencha os dois campos.");
      }

      // Verifica se a senha atual está correta
      const senhaCorreta = await bcrypt.compare(data.senhaAtual, userDb.password);
      if (!senhaCorreta) {
        throw new Error("Senha atual incorreta.");
      }

      // Cria o hash da nova senha
      if (data.novaSenha.length < 6) throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
      updates.password = await bcrypt.hash(data.novaSenha, 10);
    }

    const [rowsUpdate] = await UserRepository.update(userIdToken, updates);
    if (!rowsUpdate) throw new Error("Usuário não encontrado.");

    // Busca usuário atualizado
    const updatedUser = await UserRepository.findByIdWithAccess(userIdToken);

    // Gera novo token
    const token = jwt.sign(
      { id: updatedUser.id, adm: updatedUser.adm, v: updatedUser.tokenVersion || 0 },
      SECRET,
      { expiresIn: "30m" }
    );

    return { 
      message: "Usuário atualizado com sucesso", 
      user: serializeAuthenticatedUser(updatedUser),
      token
    };
  }

  static async updateAvatar(userId, avatarUrl) {
    const user = await UserRepository.findById(userId)
    if (!user) throw new Error('Usuário não encontrado.')
    await UserRepository.update(userId, { avatarUrl })
    if (user.avatarUrl && user.avatarUrl !== avatarUrl) await deleteImage(user.avatarUrl).catch(() => {})
    const updatedUser = await UserRepository.findByIdWithAccess(userId)
    return { message: 'Foto de perfil atualizada com sucesso.', user: serializeAuthenticatedUser(updatedUser) }
  }

  static async removeAvatar(userId) {
    const user = await UserRepository.findById(userId)
    if (!user) throw new Error('Usuário não encontrado.')
    await UserRepository.update(userId, { avatarUrl: null })
    if (user.avatarUrl) await deleteImage(user.avatarUrl).catch(() => {})
    const updatedUser = await UserRepository.findByIdWithAccess(userId)
    return { message: 'Foto de perfil removida com sucesso.', user: serializeAuthenticatedUser(updatedUser) }
  }

  // Alterar perfil de administrador(apenas adm pode fazer)
  static async updateAdm(targetUserId, admStatus, requesterAdm, requesterId) {
    if (!requesterAdm) {
      throw new Error('Apenas administradores podem alterar permissões.')
    }
    if (Number(targetUserId) === Number(requesterId)) {
      throw new Error('Você não pode alterar a permissão da própria conta.')
    }
    const targetUser = await UserRepository.findById(targetUserId)
    if (!targetUser) {
      throw new Error('Usuário alvo não encontrado.')
    }
    //checar se é o último admin
    if (admStatus === false) {
    const adminsCount = await UserRepository.countAdmins()
    if (adminsCount <= 1 && targetUser.adm) 
      throw new Error('Não é permitido remover a última conta de administrador.')
    }
    await UserRepository.updateAdm(targetUserId, admStatus)
    return { message: `Permissão de administrador ${admStatus ? 'concedida' : 'removida'} com sucesso.` }
  }

  // Logout (invalidação simbólica)
  static async logout(userId) {
    const user = await UserRepository.findById(userId)
    if (!user) throw new Error('Usuário não encontrado.')
    await UserRepository.update(userId, { tokenVersion: (user.tokenVersion || 0) + 1 })
    return { message: 'Logout realizado com sucesso' }
  }

  // Deletar
  static async delete(userIdToken, senhaAtual) {
    const user = await UserRepository.findById(userIdToken)
    if (!user) throw new Error('Usuário não encontrado.')
    if (!senhaAtual || !(await bcrypt.compare(senhaAtual, user.password))) throw new Error('Senha atual incorreta.')
    const rowsDel = await UserRepository.delete(userIdToken)
    if (!rowsDel) throw new Error('Usuário não encontrado.')
    return { message: 'Usuário excluído com sucesso' }
  }
}

module.exports = UserService
