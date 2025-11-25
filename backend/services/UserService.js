const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const UserRepository = require('../repositories/UserRepository')
const SECRET = process.env.JWT_SECRET

class UserService {
    
  // Cadastrar usuário
  static async register({ username, email, password }) {
    const existingEmail = await UserRepository.findByEmail(email)
    if (existingEmail) throw new Error('E-mail já cadastrado.')
    const existingUsername =  await UserRepository.findByUsername(username)
    if (existingUsername) throw new Error('Nome de usuário já cadastrado.')

    const hashed = await bcrypt.hash(password, 10)
    return UserRepository.create({ username, email, password: hashed })
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
      user: { id: user.id, username: user.username, email: user.email, adm: user.adm }
    }
  }

  // Listar todos
  static async getAll() {
    return UserRepository.findAll()
  }

  //Lista todos os usuários com a contagem de denúncias feitas por cada um
  static async getAllWithDenunciaCount() {
    return UserRepository.findAllUsersWithDenuniaCount();
  }

  // Buscar um usuário
  static async getById(id) {
    const user = await UserRepository.findById(id)
    if (!user) throw new Error('Usuário não encontrado.')
    return user
  }

  // Atualizar
  static async update(data,userIdToken) {
    delete data.adm // impedir alteração de adm por este método
    if (data.password) data.password = await bcrypt.hash(data.password, 10)
    const [rowsUpdate] = await UserRepository.update(userIdToken, data)
    if (!rowsUpdate) throw new Error('Usuário não encontrado.')
    return { message: 'Usuário atualizado com sucesso' }
  }

  // Alterar perfil de administrador(apenas adm pode fazer)
  static async updateAdm(targetUserId, admStatus, requesterAdm) {
    if (!requesterAdm) {
      throw new Error('Apenas administradores podem alterar permissões.')
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