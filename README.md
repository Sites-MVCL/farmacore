# FARMACORE

Trilha de farmacologia para **técnicos de enfermagem**. Cada missão tem duas partes: **Aula** (ensina do zero,
com resumo e glossário) e **Treino gamificado** (liberado depois da aula). 9 missões + desafio final,
37 jogos e simuladores (janela de dose, jornada ADME, curvas por via, receptores, inspetor de prescrição,
simulador dos 5 certos, arsenal de classes, insulinas). Visual futurista, progresso salvo no próprio aparelho.

- **Abrir:** `index.html` (arquivo único, funciona offline; só as fontes vêm do Google Fonts).
- **Conteúdo:** `src/conteudo/` — `missoes.json` (metadados e ordem do treino), `aula_m1..m9.json` (as aulas) e `jogos_a/b.json` (jogos e simuladores). Edite o JSON, não o HTML.
- **Rebuild:** `python3 build.py` junta JSON + CSS + JS em `index.html` (e gera `conteudo.json` consolidado).

Base: *Farmacologia — Técnico em Enfermagem, Módulo 1 (CETEP)*. Material educativo; não substitui prescrição,
bula, protocolo da instituição nem orientação do enfermeiro/farmacêutico. Casos e valores dos simuladores são fictícios.

## Créditos
Idealizado, planejado e desenvolvido por **Cybele França Brito**.

## Fonte e bibliografia
- CETEP. *Farmacologia: Técnico em Enfermagem, Módulo 1*. Material didático do curso técnico (fonte principal do conteúdo).
- COFEN. Resolução COFEN nº 564/2017: Código de Ética dos Profissionais de Enfermagem.
- BRASIL. Lei nº 7.498/1986: exercício da enfermagem.
- BRASIL. Lei nº 9.787/1999: medicamento genérico.
- ANVISA. Resolução nº 391/1999: regulamento técnico de medicamentos genéricos (citada no módulo).
- BRASIL. Ministério da Saúde; ANVISA; FIOCRUZ. Protocolo de segurança na prescrição, uso e administração de medicamentos, 2013.
