import express from 'express';
import {
    buscarCirurgias,
    exportarCirurgias
} from '../controllers/pacienteController.js';

const router = express.Router();

router.get('/buscar', buscarCirurgias);
router.get('/exportar', exportarCirurgias);

export default router;