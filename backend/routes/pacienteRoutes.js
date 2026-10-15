import express from 'express';
import {
    getPacientes,
    createPaciente,
    updatePaciente,
    deletePaciente,
    exportPacientes,
    getRecentPacientes,
    getPacienteByCpf,
    getPacientesByKpi
} from '../controllers/pacienteController.js';
import modificationLimiter from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/recentes', getRecentPacientes);

router.get('/kpi/:kpiName', getPacientesByKpi);

router.get('/export', exportPacientes);

router.route('/')
    .get(getPacientes)
    .post(createPaciente);

router.route('/:cpf')
    .get(getPacienteByCpf)
    .put(modificationLimiter, updatePaciente)
    .delete(modificationLimiter, deletePaciente);

export default router;
