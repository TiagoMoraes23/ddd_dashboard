const gerarPlanilhaCirurgias = require('../../../../../shared/infra/excel/gerarPlanilhaCirurgias');

// Faz JSON.parse defensivo de um parâmetro de querystring — o frontend envia
// filtrosPaciente/filtrosCirurgia como string JSON (mesmo objeto já usado
// pela busca em tela), entrada mal formada não deve derrubar a exportação.
function parseFiltros(valor) {
  if (!valor) return {};
  try {
    const parsed = JSON.parse(valor);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (err) {
    return {};
  }
}

class ExportarCirurgiasController {
  constructor(exportarCirurgiasUseCase) {
    this.exportarCirurgiasUseCase = exportarCirurgiasUseCase;
  }

  async handle(req, res) {
    try {
      const { q } = req.query;
      const filtrosPaciente = parseFiltros(req.query.filtrosPaciente);
      const filtrosCirurgia = parseFiltros(req.query.filtrosCirurgia);

      const linhas = await this.exportarCirurgiasUseCase.execute({ filtrosPaciente, filtrosCirurgia, q });
      const workbook = gerarPlanilhaCirurgias(linhas);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="relatorio_cirurgias.xlsx"');

      await workbook.xlsx.write(res);
      return res.end();
    } catch (error) {
      console.error('Erro ao exportar planilha de cirurgias:', error);
      return res.status(500).json({ message: 'Ocorreu um erro interno ao gerar a planilha.' });
    }
  }
}

module.exports = ExportarCirurgiasController;
