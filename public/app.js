// ============================================================
// AVA Kroton — Frontend Dashboard Logic
// ============================================================

// ── Variables ───────────────────────────────────────────────
let sseSource = null;
let currentDisciplina = null;

// ── DOM Elements ────────────────────────────────────────────
const els = {
  statusBadge: document.getElementById('statusBadge'),
  statusText: document.getElementById('statusText'),
  btnLogout: document.getElementById('btnLogout'),
  logConsole: document.getElementById('logConsole'),
  
  steps: document.querySelectorAll('.step'),
  sectionLogin: document.getElementById('sectionLogin'),
  sectionDisciplinas: document.getElementById('sectionDisciplinas'),
  sectionNav: document.getElementById('sectionNav'),
  sectionResult: document.getElementById('sectionResult'),
  
  inputLogin: document.getElementById('inputLogin'),
  inputSenha: document.getElementById('inputSenha'),
  checkSave: document.getElementById('checkSave'),
  btnLogin: document.getElementById('btnLogin'),
  
  disciplinasList: document.getElementById('disciplinasList'),
  unidadesList: document.getElementById('unidadesList'),
  seccoesList: document.getElementById('seccoesList'),
  atividadesList: document.getElementById('atividadesList'),
  
  loadingDisciplinas: document.getElementById('loadingDisciplinas'),
  loadingUnidades: document.getElementById('loadingUnidades'),
  
  cardUnidades: document.getElementById('cardUnidades'),
  cardSeccoes: document.getElementById('cardSeccoes'),
  cardAtividades: document.getElementById('cardAtividades'),
  btnResolver: document.getElementById('btnResolver'),
  
  scoreCard: document.getElementById('scoreCard'),
  scoreValue: document.getElementById('scoreValue'),
};

// ── Init ────────────────────────────────────────────────────
window.onload = async () => {
  connectSSE();
  checkCookies();
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.saved && data.login) {
      els.inputLogin.value = data.login;
      els.inputSenha.placeholder = "Senha salva (protegida)";
      addLog('<i class="ph-fill ph-check-circle"></i> Credenciais salvas carregadas. Prontas para uso.');
    }
  } catch (err) {
    console.error(err);
  }
};

// ── Cookies ─────────────────────────────────────────────────
function checkCookies() {
  if (localStorage.getItem('oryon_cookies_accepted') === 'true') {
    document.getElementById('cookieBar').style.display = 'none';
  }
}
function acceptCookies() {
  localStorage.setItem('oryon_cookies_accepted', 'true');
  document.getElementById('cookieBar').style.display = 'none';
}

// ── SSE Logs ────────────────────────────────────────────────
function connectSSE() {
  if (sseSource) sseSource.close();
  sseSource = new EventSource('/api/logs');
  
  sseSource.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'connected') {
        els.statusBadge.classList.add('connected');
        els.statusText.textContent = 'Servidor Conectado';
      } else if (msg.type === 'log') {
        addLog(msg.data);
      } else if (msg.type === 'status') {
        if (msg.data === 'logged_in') {
          showStep(2);
          loadDisciplinas();
        }
      } else if (msg.type === 'done') {
        showResult(msg.data);
      }
    } catch {}
  };
  
  sseSource.onerror = () => {
    els.statusBadge.classList.remove('connected');
    els.statusText.textContent = 'Tentando reconectar...';
  };
}

function addLog(text) {
  const line = document.createElement('div');
  line.className = 'log-line';
  
  const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });
  const timeSpan = document.createElement('span');
  timeSpan.className = 'log-time';
  timeSpan.textContent = `[${time}]`;
  
  const msgSpan = document.createElement('span');
  msgSpan.className = 'log-msg';
  
  // Detecção por texto ao invés de emojis
  const lower = text.toLowerCase();
  if (lower.includes('[sucesso]') || lower.includes('✅') || text.includes('🏆') || lower.includes('[oryon] resposta processada')) {
    msgSpan.classList.add('success');
  } else if (lower.includes('[erro]') || lower.includes('[aviso]') || lower.includes('falha') || text.includes('❌') || text.includes('⚠️')) {
    msgSpan.classList.add('error');
  } else if (lower.includes('[oryon]') || lower.includes('motor') || text.includes('⚡') || text.includes('🔍')) {
    msgSpan.classList.add('ai');
  }
  
  msgSpan.innerHTML = text; // Permite renderizar tags <i> do Phosphor
  
  line.appendChild(timeSpan);
  line.appendChild(msgSpan);
  els.logConsole.appendChild(line);
  els.logConsole.scrollTop = els.logConsole.scrollHeight;
}

function clearLogs() {
  els.logConsole.innerHTML = '';
}

// ── UI Helpers ──────────────────────────────────────────────
function showStep(stepNum) {
  els.steps.forEach(s => {
    const num = parseInt(s.dataset.step);
    if (num < stepNum) {
      s.classList.add('done');
      s.classList.remove('active');
    } else if (num === stepNum) {
      s.classList.add('active');
      s.classList.remove('done');
    } else {
      s.classList.remove('active', 'done');
    }
  });

  document.querySelectorAll('.section').forEach(s => s.classList.remove('visible'));
  
  if (stepNum === 1) els.sectionLogin.classList.add('visible');
  if (stepNum === 2) els.sectionDisciplinas.classList.add('visible');
  if (stepNum === 3) els.sectionNav.classList.add('visible');
  if (stepNum === 4) els.sectionResult.classList.add('visible');
}

function createItemCard(text, index, onclick) {
  const card = document.createElement('div');
  card.className = 'item-card';
  card.innerHTML = `
    <div class="item-num">${index + 1}</div>
    <div class="item-name">${text}</div>
  `;
  card.onclick = () => {
    const parent = card.parentElement;
    parent.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    onclick();
  };
  return card;
}

// ── API Calls ───────────────────────────────────────────────
async function fetchPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(err.error || 'Erro na requisição');
  }
  return res.json();
}

async function fetchGet(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(err.error || 'Erro na requisição');
  }
  return res.json();
}

// ── Flows ───────────────────────────────────────────────────

async function doLogin() {
  const login = els.inputLogin.value.trim();
  const senha = els.inputSenha.value;
  const save = els.checkSave.checked;
  
  if (!login) return alert('Por favor, informe seu login.');
  
  els.btnLogin.disabled = true;
  els.btnLogin.innerHTML = '<div class="spinner" style="width:14px;height:14px"></div> Autenticando...';
  
  try {
    const res = await fetchPost('/api/login', { login, senha, save });
    if (res.success) {
      els.btnLogout.style.display = 'block';
      // showStep(2); -> acionado via SSE msg {type: 'status', data: 'logged_in'}
    }
  } catch (err) {
    alert(err.message);
  } finally {
    els.btnLogin.disabled = false;
    els.btnLogin.innerHTML = '<i class="ph-bold ph-rocket-launch"></i> Entrar no Sistema';
  }
}

async function logout() {
  try {
    await fetchPost('/api/logout', {});
  } catch {}
  location.reload();
}

// ── Passo 2: Disciplinas ──
async function loadDisciplinas() {
  els.disciplinasList.innerHTML = '';
  els.loadingDisciplinas.style.display = 'flex';
  
  try {
    const data = await fetchGet('/api/disciplinas');
    els.loadingDisciplinas.style.display = 'none';
    
    if (!data.disciplinas || data.disciplinas.length === 0) {
      els.disciplinasList.innerHTML = '<div style="color:var(--danger)">Nenhuma disciplina encontrada.</div>';
      return;
    }
    
    data.disciplinas.forEach((disc, i) => {
      els.disciplinasList.appendChild(createItemCard(disc.titulo, i, async () => {
        currentDisciplina = disc.titulo;
        await fetchPost('/api/disciplina', { targetInfo: disc });
        showStep(3);
        loadUnidades();
      }));
    });
  } catch (err) {
    els.loadingDisciplinas.style.display = 'none';
    addLog(`[ERRO] ${err.message}`);
  }
}

// ── Passo 3: Unidades / Seções / Atividades ──
async function loadUnidades() {
  els.unidadesList.innerHTML = '';
  els.seccoesList.innerHTML = '';
  els.atividadesList.innerHTML = '';
  els.cardSeccoes.style.display = 'none';
  els.cardAtividades.style.display = 'none';
  els.btnResolver.style.display = 'none';
  els.loadingUnidades.style.display = 'flex';
  
  try {
    const data = await fetchGet('/api/unidades');
    els.loadingUnidades.style.display = 'none';
    
    if (data.unidades.length === 0) {
      els.unidadesList.innerHTML = '<div style="color:var(--warning)">Nenhuma unidade detectada (tente navegar manualmente ou a página é diferente).</div>';
      // Permitir forçar resolução
      els.btnResolver.style.display = 'inline-flex';
      return;
    }
    
    data.unidades.forEach((uni, i) => {
      els.unidadesList.appendChild(createItemCard(uni, i, async () => {
        addLog(`<i class="ph ph-spinner-gap ph-spin"></i> Navegando para ${uni}...`);
        await fetchPost('/api/click', { name: uni });
        loadSeccoes(uni);
      }));
    });
  } catch (err) {
    els.loadingUnidades.style.display = 'none';
    addLog(`❌ Erro: ${err.message}`);
  }
}

async function loadSeccoes(unidade) {
  els.seccoesList.innerHTML = '';
  els.cardSeccoes.style.display = 'block';
  els.cardAtividades.style.display = 'none';
  els.btnResolver.style.display = 'none';
  addLog(`<i class="ph-bold ph-arrows-clockwise ph-spin"></i> Carregando seções para ${secao}...`);
  
  try {
    const data = await fetchPost('/api/seccoes', { unidade });
    
    if (data.seccoes.length === 0) {
      addLog('[AVISO] Nenhuma seção encontrada.');
      els.btnResolver.style.display = 'inline-flex'; // Talvez a ativ. esteja direto
      return;
    }
    
    data.seccoes.forEach((sec, i) => {
      els.seccoesList.appendChild(createItemCard(sec, i, async () => {
        await fetchPost('/api/click', { name: sec });
        loadAtividades(sec);
      }));
    });
  } catch (err) {}
}

async function loadAtividades(secao) {
  els.atividadesList.innerHTML = '';
  els.cardAtividades.style.display = 'block';
  els.btnResolver.style.display = 'none';
  addLog(`<i class="ph-bold ph-arrows-clockwise ph-spin"></i> Carregando atividades para ${secao}...`);
  
  try {
    const data = await fetchPost('/api/atividades', { secao });
    
    if (data.atividades.length === 0) {
      addLog('[AVISO] Nenhuma atividade identificada. Verifique no painel.');
      els.btnResolver.style.display = 'inline-flex';
      return;
    }
    
    data.atividades.forEach((atv, i) => {
      let badgeColor = 'var(--text-muted)';
      if (atv.status === 'CONCLUÍDA') badgeColor = 'var(--success)';
      if (atv.status === 'PENDENTE') badgeColor = 'var(--warning)';

      const statusHtml = `<span style="font-size:10px; padding:2px 8px; border-radius:12px; margin-left:10px; background:${badgeColor}; color:var(--bg-primary); white-space:nowrap; vertical-align:middle; font-weight:700;">${atv.status}</span>`;
      
      els.atividadesList.appendChild(createItemCard(atv.titulo + statusHtml, i, async () => {
        if (atv.status === 'CONCLUÍDA') {
          if (!confirm('Esta atividade já foi concluída. Deseja refazer para tentar melhorar a nota?')) {
            // Deselecionar visualmente (remover a classe selected)
            const cards = els.atividadesList.querySelectorAll('.item-card');
            cards.forEach(c => c.classList.remove('selected'));
            return;
          }
        }
        await fetchPost('/api/click', { name: atv });
        els.btnResolver.style.display = 'inline-flex';
      }));
    });
  } catch (err) {}
}

// ── Passo 4: Automação ──
async function startResolver() {
  els.btnResolver.disabled = true;
  els.btnResolver.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-top-color:white;"></div> Resolvendo...';
  
  try {
    addLog(`<i class="ph-bold ph-rocket-launch"></i> Iniciando resolução para: ${currentDisciplina}`);
    const res = await fetchPost('/api/resolver', { disciplina: currentDisciplina });
    
    if (res.status === 'success') {
      showResult({ score: res.aproveitamento, time: res.tempo_execucao, total: res.questoes.length });
    }
  } catch (err) {
    addLog(`[ERRO] Falha fatal: ${err.message}`);
    alert(`Falha: ${err.message}`);
  } finally {
    els.btnResolver.disabled = false;
    els.btnResolver.innerHTML = '<i class="ph-bold ph-robot"></i> Iniciar Motor de Automação';
  }
}

function showResult(data) {
  showStep(4);
  els.scoreCard.classList.add('visible');
  els.scoreValue.textContent = data.score;
  
  if (data.notas && data.tempoEmpregado) {
    els.scoreCard.innerHTML = `
      <div style="font-size: 40px; margin-bottom: 12px;">🏆</div>
      <div class="score-value">${data.score}</div>
      <div class="score-label">Aproveitamento Final</div>
      
      <div style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 16px; margin-top: 20px; text-align: left; font-size: 13px; color: var(--text-secondary);">
        <div style="margin-bottom: 8px;"><strong>Estado:</strong> ${data.status || 'Finalizada'}</div>
        <div style="margin-bottom: 8px;"><strong>Tempo empregado:</strong> ${data.tempoEmpregado}</div>
        <div style="margin-bottom: 8px;"><strong>Notas brutas:</strong> ${data.notas}</div>
        <div><strong>Total de questões respondidas:</strong> ${data.total}</div>
      </div>
      
      <div class="post-quiz-menu" id="postQuizMenu">
        <button class="btn btn-primary" onclick="refazerQuestionario()">🔄 Refazer este Questionário</button>
        <button class="btn btn-ghost" onclick="voltarDisciplinas()">📚 Voltar para Disciplinas</button>
        <button class="btn btn-danger" onclick="sairFechar()">🚪 Sair e Fechar Navegador</button>
      </div>
    `;
  }
}

// ── Pós-Questionário: Ações ──
async function refazerQuestionario() {
  addLog('<i class="ph-bold ph-arrows-clockwise ph-spin"></i> Solicitando nova tentativa...');
  showStep(3); // Volta para a tela de Seções onde o botão Iniciar Automação está
  els.btnResolver.style.display = 'inline-flex';
}

async function voltarDisciplinas() {
  addLog('<i class="ph-bold ph-books"></i> Retornando para a seleção de disciplinas...');
  showStep(2);
  loadDisciplinas();
}

async function sairFechar() {
  addLog('<i class="ph-bold ph-sign-out"></i> Encerrando a sessão segura...');
  try {
    await fetchPost('/api/logout', {});
  } catch {}
  location.reload();
}

// ── Suporte à tecla Enter ──
els.inputLogin.addEventListener('keypress', e => { if (e.key === 'Enter') els.inputSenha.focus(); });
els.inputSenha.addEventListener('keypress', e => { if (e.key === 'Enter') doLogin(); });
