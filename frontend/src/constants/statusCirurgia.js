// Único ponto de verdade para os status de cirurgia — antes duplicado em
// PacienteForm.jsx, PacienteCard.jsx, SurgeryResultsTable.jsx,
// FiltrosBuscaPanel.jsx e RegistrosRecentes.jsx, arriscando divergir caso
// um status fosse adicionado/renomeado em só um dos lugares.
export const STATUS_CIRURGIA = [
  'Autorizado',
  'Agendado',
  'Realizado',
  'Agendamento Pendente',
  'Senha expirada',
  'Cancelado (outro motivo)',
];

export const CORES_STATUS_CIRURGIA = {
  Realizado: 'bg-green-100 text-green-800',
  Agendado: 'bg-blue-100 text-blue-800',
  Autorizado: 'bg-yellow-100 text-yellow-800',
  'Agendamento Pendente': 'bg-orange-100 text-orange-800',
  'Senha expirada': 'bg-red-100 text-red-800',
  'Cancelado (outro motivo)': 'bg-red-100 text-red-800',
};
