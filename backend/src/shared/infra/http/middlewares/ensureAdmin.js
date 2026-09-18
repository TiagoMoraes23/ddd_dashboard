// Deve rodar sempre depois de ensureAuthenticated, que popula req.user a partir do JWT verificado.
function ensureAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso restrito a administradores.' });
  }
  return next();
}

module.exports = ensureAdmin;
