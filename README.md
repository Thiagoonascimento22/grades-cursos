# Central de Grades · Escola Instructiva

Um lugar só com a grade curricular de todos os cursos. A equipe seleciona o curso,
escolhe o formato e copia o texto já pronto pra colar no WhatsApp.

## Telas

- `/` — **Central de Grades**: busca, lista de cursos, grade completa e prévia do texto
  que será colado. Três formatos: grade completa, só os módulos, resumo.
  - **Divisão automática em mensagens**: grades longas passam dos 4.096 caracteres do
    WhatsApp. O sistema quebra o texto em partes numeradas — "(2/3)" — cortando entre
    módulos, nunca no meio de um. Cada parte tem seu botão de copiar.
  - Botão "Copiar" em cada módulo manda só aquele módulo, com descrição, conteúdos,
    o que o aluno vai aprender e o diferencial.
  - "Copiar lista" nas obras do professor manda os livros com edição e ISBN.
  - "Com descrição dos módulos" engrossa o texto; "Sem asteriscos" limpa a formatação
    para e-mail, site ou PDF.
- `/admin.html` — **Gerenciar cursos**: cadastrar, editar, duplicar, reordenar e excluir.
  Campo "Colar grade em texto" transforma a grade colada em módulos e tópicos
  automaticamente — reconhece "Módulo I", títulos terminados em dois-pontos e
  linhas de "Carga horária: 36h". Cada módulo tem um painel de detalhes com
  descrição, aprendizados e diferencial.
  - **Backup** baixa todos os cursos em um JSON.
  - **Importar** carrega um JSON de volta — serve para restaurar um backup ou para
    subir uma grade já montada. Pergunta se você quer adicionar aos cursos atuais
    ou substituir tudo. Cursos com nome repetido entram como "(importado)", nada é
    sobrescrito em silêncio.

## Rodar local

```bash
npm install
npm start
# abre em http://localhost:3000
```

## Deploy no Railway

1. Novo projeto → conectar o repositório do GitHub (ou subir este zip).
2. Start command: `npm start` (já configurado no package.json).
3. **Volume**: criar um Volume e montar em `/data`. Sem isso, os cursos somem a cada deploy.
4. Variáveis de ambiente:

| Variável | Valor | Para quê |
|---|---|---|
| `DATA_DIR` | `/data` | onde o banco de cursos é gravado |
| `ADMIN_SENHA` | *(defina uma)* | senha do painel de gestão |

Senha padrão, se `ADMIN_SENHA` não for definida: `instructiva2026`.
**Defina `ADMIN_SENHA` no Railway antes de liberar o painel para a equipe.**

## Marca

Logo em `public/logo.png` (fundo transparente) e favicon em `public/favicon.png`.
Paleta: grafite `#1A1815` como cor principal, laranja `#EE8A0C` do próprio logo usado
só como acento — filete do curso selecionado, marcador de aprendizado e citação de
diferencial. Tipografia: Anton nos títulos, Manrope no texto.

## Onde ficam os dados

Arquivo JSON único em `$DATA_DIR/grades.json`, com fila de escrita para não corromper
quando duas pessoas salvam ao mesmo tempo.

**Importante:** depois do primeiro deploy com Volume, o banco passa a viver no Volume
do Railway. O `data/grades.json` que vem no zip só é usado se o arquivo ainda não
existir lá — subir um zip novo **não** substitui os cursos já cadastrados, e isso é
proposital. Para levar cursos de um ambiente pro outro, use Backup e Importar.

## Formato de um curso

```json
{
  "nome": "Nome do curso",
  "subtitulo": "Chamada curta",
  "cargaHoraria": "360 horas",
  "nivel": "Do zero ao avançado",
  "modalidade": "",
  "certificado": "",
  "numeracao": "romana",
  "descricao": "...",
  "objetivo": "...",
  "destaques": ["Diferencial da formação", "..."],
  "modulos": [{
    "parte": "Parte 1 · Fundamentos — 72h",
    "titulo": "Título do módulo",
    "cargaHoraria": "36h",
    "descricao": "...",
    "aulas": ["Tópico abordado", "..."],
    "aprende": ["o que o participante sai fazendo", "..."],
    "diferencial": "..."
  }],
  "livros": [{
    "titulo": "Título do livro",
    "edicao": "1ª edição",
    "isbn": "000-00-00000-00-0",
    "aplicacao": "..."
  }],
  "bonus": [],
  "observacoes": "..."
}
```

`numeracao` aceita `"romana"` (I, II, III) ou `"arabica"` (01, 02, 03).
Campos vazios simplesmente não aparecem na tela nem no texto copiado.
