import express from 'express';
import User from '../models/User.js';

const router = express.Router();

router.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

router.get('/', async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.post('/', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'Este nome de utilizador já existe' });
        }
        const user = await User.create({ username, password, role });
        res.status(201).json({
            _id: user._id,
            username: user.username,
            role: user.role,
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar utilizador' });
    }
});

router.put('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
        user.username = req.body.username || user.username;
        user.role = req.body.role || user.role;
        if (req.body.password) {
            user.password = req.body.password;
        }
        
        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            username: updatedUser.username,
            role: updatedUser.role,
        });

    } else {
      res.status(404).json({ message: 'Utilizador não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'Utilizador não encontrado' });
        }

        if (req.user._id.equals(user._id)) {
            return res.status(400).json({ message: 'Não pode apagar a sua própria conta de administrador.' });
        }
        
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Utilizador removido com sucesso' });

    } catch (error) {
        console.error("Erro ao apagar utilizador:", error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

export default router;
