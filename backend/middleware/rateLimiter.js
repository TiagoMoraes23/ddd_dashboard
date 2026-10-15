import rateLimit from 'express-rate-limit';

const modificationLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: { message: 'Muitas ações de exclusão foram realizadas. Por segurança, o limite foi atingido. Por favor, aguarde 10 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req, res) => {
        if (req.user && req.user.role === 'admin') {
            return true;
        }
        return false;
    },
});

export default modificationLimiter;
