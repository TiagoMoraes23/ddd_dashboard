const Cpf = require('./Cpf');

describe('Value Object: Cpf', () => {
  // Cenários de Sucesso
  describe('Cenários de Sucesso', () => {
    it('deve criar um CPF válido ao receber apenas números', () => {
      const validCpfString = '52998224725'; // CPF válido gerado para testes
      const cpf = new Cpf(validCpfString);
      
      expect(cpf.getValue()).toBe(validCpfString);
    });

    it('deve criar um CPF válido ao receber uma string pontuada e limpar os caracteres', () => {
      const cpf = new Cpf('529.982.247-25');
      
      expect(cpf.getValue()).toBe('52998224725');
    });

    it('deve retornar o CPF corretamente formatado', () => {
      const cpf = new Cpf('52998224725');
      
      expect(cpf.getFormatted()).toBe('529.982.247-25');
    });
  });

  // Cenários de Falha
  describe('Cenários de Falha', () => {
    it('deve lançar erro ao instanciar com CPF vazio, nulo ou indefinido', () => {
      const errorMessage = 'O CPF não pode ser vazio.';
      
      expect(() => new Cpf('')).toThrow(errorMessage);
      expect(() => new Cpf(null)).toThrow(errorMessage);
      expect(() => new Cpf(undefined)).toThrow(errorMessage);
    });

    it('deve lançar erro ao receber um CPF com tamanho inválido', () => {
      const errorMessage = 'CPF inválido fornecido.';
      
      expect(() => new Cpf('123')).toThrow(errorMessage);
      expect(() => new Cpf('123456789012345')).toThrow(errorMessage);
    });

    it('deve lançar erro ao receber um CPF com todos os dígitos iguais', () => {
      const errorMessage = 'CPF inválido fornecido.';
      
      expect(() => new Cpf('11111111111')).toThrow(errorMessage);
      expect(() => new Cpf('000.000.000-00')).toThrow(errorMessage);
    });

    it('deve lançar erro ao receber um CPF que falhe na validação matemática', () => {
      const errorMessage = 'CPF inválido fornecido.';

      // CPF com formato certo e 11 dígitos, mas digitos verificadores incorretos
      expect(() => new Cpf('12345678901')).toThrow(errorMessage);
    });

    it('deve lançar erro quando apenas o primeiro dígito verificador estiver incorreto', () => {
      // '52998224725' é válido; troca só o 10º dígito (1º verificador),
      // fazendo a validação falhar logo na primeira checagem.
      expect(() => new Cpf('52998224795')).toThrow('CPF inválido fornecido.');
    });

    it('deve lançar erro quando apenas o segundo dígito verificador estiver incorreto', () => {
      // '52998224725' é válido; troca só o último dígito (2º verificador),
      // mantendo os 10 primeiros intactos — força o código a passar pela
      // validação do 1º dígito e falhar especificamente na do 2º.
      expect(() => new Cpf('52998224720')).toThrow('CPF inválido fornecido.');
    });
  });

  describe('Cpf.reconstituir', () => {
    it('não lança erro para um CPF de formato inválido vindo da persistência', () => {
      expect(() => Cpf.reconstituir('0472469501')).not.toThrow();
      expect(Cpf.reconstituir('0472469501').getValue()).toBe('0472469501');
    });

    it('ainda lança erro para CPF vazio, nulo ou indefinido', () => {
      expect(() => Cpf.reconstituir('')).toThrow('O CPF não pode ser vazio.');
      expect(() => Cpf.reconstituir(null)).toThrow('O CPF não pode ser vazio.');
    });

    it('continua funcionando normalmente para um CPF já válido', () => {
      expect(Cpf.reconstituir('529.982.247-25').getValue()).toBe('52998224725');
    });
  });
});
