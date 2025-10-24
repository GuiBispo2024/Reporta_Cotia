const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const UserRepository = require('../repositories/UserRepository')
const SECRET = process.env.JWT_SECRET

class UserService {
    
  // Cadastrar usuário
  static async register({ username, email, password }) {
    const existing = await UserRepository.findByEmail(email)
    if (existing) throw new Error('E-mail já cadastrado.')

    const hashed = await bcrypt.hash(password, 10)
    return UserRepository.create({ username, email, password: hashed })
  }

  // Login
  static async login({ email, password }) {
    const user = await UserRepository.findByEmail(email)
    if (!user) throw new Error('Usuário não encontrado.')

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new Error('Senha incorreta.')

    const token = jwt.sign({ id: user.id, adm: user.adm }, SECRET, { expiresIn: '1h' })

    return {
      message: 'Login bem-sucedido',
      token,
      user: { id: user.id, username: user.username, adm: user.adm }
    }
  }

  // Listar todos
  static async getAll() {
    return UserRepository.findAll()
  }

  // Buscar um usuário
  static async getById(id) {
    const user = await UserRepository.findById(id)
    if (!user) throw new Error('Usuário não encontrado.')
    return user
  }

  // Atualizar
  static async update(id, data,userIdToken) {
    if (parseInt(id) !== userIdToken) {
    throw new Error('Você só pode atualizar seu próprio perfil.')
  }
    const [rowsUpdate] = await UserRepository.update(id, data)
    if (!rowsUpdate) throw new Error('Usuário não encontrado.')
    return { message: 'Usuário atualizado com sucesso' }
  }

  // Deletar
  static async delete(id,userIdToken) {
    if (parseInt(id) !== userIdToken) {
    throw new Error('Você só pode excluir sua própria conta.')
  }
    const rowsDel = await UserRepository.delete(id)
    if (!rowsDel) throw new Error('Usuário não encontrado.')
    return { message: 'Usuário excluído com sucesso' }
  }
}

module.exports = UserService