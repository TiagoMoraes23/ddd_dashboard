const express = require('express');
const request = require('supertest');
const loginRateLimiter = require('./loginRateLimiter');

function criarAppDeTeste() {
  const app = express();
  app.post('/login', loginRateLimiter, (req, res) => res.status(200).json({ ok: true }));
  return app;
}

describe('Middleware: loginRateLimiter', () => {
  it('deve bloquear com 429 após exceder o limite de tentativas de login pelo mesmo IP', async () => {
    const app = criarAppDeTeste();

    for (let i = 0; i < 10; i++) {
      const resposta = await request(app).post('/login').send({});
      expect(resposta.status).toBe(200);
    }

    const respostaBloqueada = await request(app).post('/login').send({});
    expect(respostaBloqueada.status).toBe(429);
    expect(respostaBloqueada.body.message).toMatch(/Muitas tentativas/);
  });
});
