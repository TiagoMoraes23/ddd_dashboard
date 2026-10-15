import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '9h',
  });
};

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username: username.toLowerCase() });

    if (user) {
      const isMatch = await user.matchPassword(password);

      if (isMatch) {
        res.json({
          _id: user._id,
          username: user.username,
          role: user.role,
          token: generateToken(user._id, user.role),
        });
      } else {
        res.status(401).json({ message: 'Utilizador ou senha inválidos' });
      }
    } else {
      console.log(`Utilizador não encontrado: ${username}`);
      res.status(401).json({ message: 'Utilizador ou senha inválidos' });
    }
  } catch (error) {
    console.error('Erro no servidor durante o login:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

export default router;
