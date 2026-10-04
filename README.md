# Apuração Presidente 2026

Painel ao vivo da apuração do 1º turno para Presidente (eleição 6257), com dados públicos do TSE.

- Placar nacional, % apurado e quanto falta
- Mapa por estado (quem lidera, % de cada candidato, % apurado)
- Projeção do resultado (estimativa simples, não oficial)
- Evolução da % de cada candidato conforme a apuração avança
- Peso de cada região no eleitorado e saldo de votos por estado
- Tabela de todos os estados, ordenável e filtrável por região
- Atualização automática (30s a 5 min), tema claro/escuro, feito pra celular

## Como os dados chegam

O navegador de cada visitante busca direto os arquivos públicos do TSE:

```
https://resultados.tse.jus.br/oficial/ele2026/6257/dados/{uf}/{uf}-c0001-e006257-u.json
```

Se essa chamada falhar, cai na rota `/api/tse/[uf]`, que busca do servidor da Vercel (região `gru1`) e guarda em cache por 15s.

## Rodando local

```bash
npm install
npm run dev
```

Abre em http://localhost:3000.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · deploy na Vercel.

Mapa: [svg-maps/brazil](https://github.com/VictorCazanave/svg-maps) (CC BY 4.0).

Site independente, sem vínculo com o TSE. O resultado oficial é sempre o publicado pelo TSE.
