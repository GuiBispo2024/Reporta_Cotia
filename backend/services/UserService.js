const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const UserRepository = require('../repositories/UserRepository')
const SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'reporta-cotia-test-secret' : undefined)

class UserService {
    
  // Cadastrar usuário
  static async register({ username, email, password, avatarUrl = null }) {
    const existingEmail = await UserRepository.findByEmail(email)
    if (existingEmail) throw new Error('E-mail já cadastrado.')
    const existingUsername =  await UserRepository.findByUsername(username)
    if (existingUsername) throw new Error('Nome de usuário já cadastrado.')

    const hashed = await bcrypt.hash(password, 10)
    const created = await UserRepository.create({ username, email, password: hashed, avatarUrl })
    const plain = created.get ? created.get({ plain: true }) : created
    const { password: _password, ...safeUser } = plain
    return safeUser
  }

  // Login
  static async login({ email, password }) {
    const user = await UserRepository.findByEmail(email)
    if (!user) throw new Error('Usuário não encontrado.')

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new Error('Senha incorreta.')

    const token = jwt.sign({ id: user.id, adm: user.adm }, SECRET, { expiresIn: '30m' })

    return {
      message: 'Login bem-sucedido',
      token,
      user: { id: user.id, username: user.username, email: user.email, adm: user.adm, avatarUrl: user.avatarUrl || null }
    }
  }

  // Listar todos
  static async getAll() {
    return UserRepository.findAll()
  }

  //Lista todos os usuários com a contagem de denúncias feitas por cada um
  static async getAllWithDenunciaCount(isAdm = false) {
    return UserRepository.findAllUsersWithDenuniaCount(isAdm);
  }

  // Buscar um usuário
  static async getById(id) {
    const user = await UserRepository.findPublicById(id)
    if (!user) throw new Error('Usuário não encontrado.')
    return user
  }

  static async getMe(id) {
    const user = await UserRepository.findById(id)
    if (!user) throw new Error('Usuário não encontrado.')
    const plain = user.get ? user.get({ plain: true }) : user
    const { password, ...safeUser } = plain
    return safeUser
  }

  // Atualizar
  static async update(data,userIdToken) {
    
    // Impedir alteração de ADM por este método
    delete data.adm;

    // Buscar o usuário atual no banco
    const userDb = await UserRepository.findById(userIdToken);
    if (!userDb) throw new Error("Usuário não encontrado.");

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
      data.password = await bcrypt.hash(data.novaSenha, 10);
    }

    // Remover campos desnecessários antes de enviar ao banco
    delete data.senhaAtual;
    delete data.novaSenha;

    // Atualiza usuário
    const [rowsUpdate] = await UserRepository.update(userIdToken, data);
    if (!rowsUpdate) throw new Error("Usuário não encontrado.");

    // Busca usuário atualizado
    const updatedUser = await UserRepository.findById(userIdToken);

    // Remove password antes de mandar para o front
    const plainUser = updatedUser.get ? updatedUser.get({ plain: true }) : updatedUser;
    const { password, ...userWithoutPassword } = plainUser;

    // Gera novo token
    const token = jwt.sign(
      { id: updatedUser.id, adm: updatedUser.adm },
      SECRET,
      { expiresIn: "30m" }
    );

    return { 
      message: "Usuário atualizado com sucesso", 
      user: userWithoutPassword,
      token
    };
  }

  static async updateAvatar(userId, avatarUrl) {
    const user = await UserRepository.findById(userId)
    if (!user) throw new Error('Usuário não encontrado.')
    await UserRepository.update(userId, { avatarUrl })
    const updatedUser = await UserRepository.findById(userId)
    const plain = updatedUser.get ? updatedUser.get({ plain: true }) : updatedUser
    const { password, ...safeUser } = plain
    return { message: 'Foto de perfil atualizada com sucesso.', user: safeUser }
  }

  static async removeAvatar(userId) {
    const user = await UserRepository.findById(userId)
    if (!user) throw new Error('Usuário não encontrado.')
    await UserRepository.update(userId, { avatarUrl: null })
    const updatedUser = await UserRepository.findById(userId)
    const plain = updatedUser.get ? updatedUser.get({ plain: true }) : updatedUser
    const { password, ...safeUser } = plain
    return { message: 'Foto de perfil removida com sucesso.', user: safeUser }
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
  static async logout() {
    return { message: 'Logout realizado com sucesso' }
  }

  // Deletar
  static async delete(userIdToken) {
    const rowsDel = await UserRepository.delete(userIdToken)
    if (!rowsDel) throw new Error('Usuário não encontrado.')
    return { message: 'Usuário excluído com sucesso' }
  }
}

module.exports = UserService
