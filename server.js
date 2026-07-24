const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'grades.json');
const SENHA = process.env.ADMIN_SENHA || 'instructiva2026';

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- banco (JSON plano) ---------- */

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ cursos: [] }, null, 2));
}

function lerDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(raw);
    if (!Array.isArray(db.cursos)) db.cursos = [];
    return db;
  } catch (e) {
    console.error('Falha ao ler o banco:', e.message);
    return { cursos: [] };
  }
}

// fila de escrita: evita corrida quando duas pessoas salvam ao mesmo tempo
let fila = Promise.resolve();
function salvarDB(db) {
  fila = fila.then(async () => {
    const tmp = DB_PATH + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify(db, null, 2));
    await fsp.rename(tmp, DB_PATH);
  }).catch((e) => console.error('Falha ao gravar o banco:', e.message));
  return fila;
}

function novoId() {
  return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function listaLimpa(v) {
  return Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
}

function normalizarCurso(body, anterior = {}) {
  const modulos = Array.isArray(body.modulos) ? body.modulos : [];
  const livros = Array.isArray(body.livros) ? body.livros : [];
  return {
    id: anterior.id || novoId(),
    nome: (body.nome || '').trim(),
    subtitulo: (body.subtitulo || '').trim(),
    cargaHoraria: (body.cargaHoraria || '').trim(),
    nivel: (body.nivel || '').trim(),
    modalidade: (body.modalidade || '').trim(),
    certificado: (body.certificado || '').trim(),
    numeracao: body.numeracao === 'romana' ? 'romana' : 'arabica',
    descricao: (body.descricao || '').trim(),
    objetivo: (body.objetivo || '').trim(),
    destaques: listaLimpa(body.destaques),
    modulos: modulos
      .map((m) => ({
        parte: (m.parte || '').trim(),
        titulo: (m.titulo || '').trim(),
        cargaHoraria: (m.cargaHoraria || '').trim(),
        descricao: (m.descricao || '').trim(),
        aulas: listaLimpa(m.aulas),
        aprende: listaLimpa(m.aprende),
        diferencial: (m.diferencial || '').trim()
      }))
      .filter((m) => m.titulo || m.aulas.length),
    livros: livros
      .map((l) => ({
        titulo: (l.titulo || '').trim(),
        edicao: (l.edicao || '').trim(),
        isbn: (l.isbn || '').trim(),
        aplicacao: (l.aplicacao || '').trim()
      }))
      .filter((l) => l.titulo),
    bonus: listaLimpa(body.bonus),
    observacoes: (body.observacoes || '').trim(),
    ordem: Number.isFinite(body.ordem) ? body.ordem : (anterior.ordem ?? 999),
    atualizadoEm: new Date().toISOString()
  };
}

/* ---------- autenticação simples ---------- */

function exigirSenha(req, res, next) {
  const enviada = req.get('x-senha') || '';
  if (enviada !== SENHA) {
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }
  next();
}

/* ---------- rotas públicas (consulta) ---------- */

app.get('/api/grades', (req, res) => {
  const db = lerDB();
  const cursos = [...db.cursos].sort(
    (a, b) => (a.ordem ?? 999) - (b.ordem ?? 999) || a.nome.localeCompare(b.nome, 'pt-BR')
  );
  res.json(cursos);
});

app.get('/api/grades/:id', (req, res) => {
  const db = lerDB();
  const curso = db.cursos.find((c) => c.id === req.params.id);
  if (!curso) return res.status(404).json({ erro: 'Curso não encontrado.' });
  res.json(curso);
});

/* ---------- rotas de gestão ---------- */

app.post('/api/login', (req, res) => {
  if ((req.body?.senha || '') !== SENHA) {
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }
  res.json({ ok: true });
});

app.post('/api/grades', exigirSenha, async (req, res) => {
  if (!req.body?.nome?.trim()) return res.status(400).json({ erro: 'O curso precisa de um nome.' });
  const db = lerDB();
  const curso = normalizarCurso(req.body);
  if (!Number.isFinite(req.body.ordem)) curso.ordem = db.cursos.length + 1;
  db.cursos.push(curso);
  await salvarDB(db);
  res.json(curso);
});

app.put('/api/grades/:id', exigirSenha, async (req, res) => {
  const db = lerDB();
  const i = db.cursos.findIndex((c) => c.id === req.params.id);
  if (i === -1) return res.status(404).json({ erro: 'Curso não encontrado.' });
  if (!req.body?.nome?.trim()) return res.status(400).json({ erro: 'O curso precisa de um nome.' });
  db.cursos[i] = normalizarCurso(req.body, db.cursos[i]);
  await salvarDB(db);
  res.json(db.cursos[i]);
});

app.delete('/api/grades/:id', exigirSenha, async (req, res) => {
  const db = lerDB();
  const i = db.cursos.findIndex((c) => c.id === req.params.id);
  if (i === -1) return res.status(404).json({ erro: 'Curso não encontrado.' });
  const [removido] = db.cursos.splice(i, 1);
  await salvarDB(db);
  res.json({ ok: true, removido: removido.nome });
});

// reordenar a lista: recebe array de ids na ordem desejada
app.post('/api/grades/ordenar', exigirSenha, async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const db = lerDB();
  ids.forEach((id, idx) => {
    const c = db.cursos.find((x) => x.id === id);
    if (c) c.ordem = idx + 1;
  });
  await salvarDB(db);
  res.json({ ok: true });
});

// backup completo em JSON
app.get('/api/backup', exigirSenha, (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="grades-backup.json"');
  res.json(lerDB());
});

// importar cursos de um arquivo JSON (backup ou curso avulso)
// modo "adicionar" mantém o que já existe; "substituir" troca todo o banco
app.post('/api/importar', exigirSenha, async (req, res) => {
  const bruto = req.body?.conteudo;
  const modo = req.body?.modo === 'substituir' ? 'substituir' : 'adicionar';
  if (!bruto) return res.status(400).json({ erro: 'Nada para importar.' });

  const entrada = Array.isArray(bruto) ? bruto : Array.isArray(bruto.cursos) ? bruto.cursos : [bruto];
  const validos = entrada.filter((c) => c && typeof c === 'object' && String(c.nome || '').trim());
  if (!validos.length) {
    return res.status(400).json({ erro: 'O arquivo não tem nenhum curso com nome. Confira se é um backup da Central de Grades.' });
  }

  const db = lerDB();
  if (modo === 'substituir') db.cursos = [];

  const nomesExistentes = new Set(db.cursos.map((c) => c.nome.toLowerCase()));
  let adicionados = 0, renomeados = 0;

  validos.forEach((c, i) => {
    const curso = normalizarCurso({ ...c, ordem: db.cursos.length + i + 1 });
    if (nomesExistentes.has(curso.nome.toLowerCase())) {
      curso.nome += ' (importado)';
      renomeados++;
    }
    nomesExistentes.add(curso.nome.toLowerCase());
    db.cursos.push(curso);
    adicionados++;
  });

  await salvarDB(db);
  res.json({ ok: true, adicionados, renomeados, total: db.cursos.length });
});

app.get('/health', (req, res) => res.json({ ok: true, cursos: lerDB().cursos.length }));

app.listen(PORT, () => {
  console.log(`Central de Grades rodando na porta ${PORT}`);
  console.log(`Banco: ${DB_PATH}`);
});
