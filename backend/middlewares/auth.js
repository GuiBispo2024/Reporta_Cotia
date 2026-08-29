const jwt = require("jsonwebtoken")
const SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'reporta-cotia-test-secret' : undefined)

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).json({ message: "Você precisa entrar na sua conta para continuar.", code: "AUTH_REQUIRED" })
    }

    const [, token] = authHeader.split(" ")

    if (!token) {
        return res.status(401).json({ message: "Você precisa entrar na sua conta para continuar.", code: "AUTH_REQUIRED" })
    }

    try {
        const decoded = jwt.verify(token, SECRET)
        req.user = decoded
        next()
    } catch (error) {
        return res.status(401).json({ message: "Sua sessão expirou. Entre novamente para continuar.", code: "SESSION_EXPIRED" })
    }
}
