import { onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, updateDoc, deleteDoc, setDoc, addDoc, onSnapshot, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const EMAIL_ADMIN = "gustavo.ponce.ifpr@gmail.com"; 
let usuarioAtualNome = "Aluno"; 
let isAdmin = false;

// ==========================================
// A GRADE CURRICULAR AUTOMATIZADA (INF2)
// ==========================================
const gradeAulas = {
  0: { dia: "Domingo", aulas: [] },
  1: { dia: "Segunda", aulas: [{hora: "07:30 - 09:30", nome: "Lóg. Prog. / Suporte TI"}, {hora: "10:00 - 12:00", nome: "Lóg. Prog. / Suporte TI"}] },
  2: { dia: "Terça", aulas: [{hora: "07:30 - 09:30", nome: "Língua Portuguesa II"}, {hora: "10:00 - 12:00", nome: "Física II"}] },
  3: { dia: "Quarta", aulas: [{hora: "07:30 - 09:30", nome: "Educação Física II"}, {hora: "10:00 - 12:00", nome: "Língua Inglesa II"}] },
  4: { dia: "Quinta", aulas: [{hora: "07:30 - 09:30", nome: "Química II"}, {hora: "10:00 - 12:00", nome: "Matemática II"}] },
  5: { dia: "Sexta", aulas: [{hora: "07:30 - 09:30", nome: "Biologia II"}, {hora: "10:00 - 12:00", nome: "Análise de Sistemas"}] },
  6: { dia: "Sábado", aulas: [] }
};

// ==========================================
// 1. INICIALIZAÇÃO E SEGURANÇA
// ==========================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "alunos", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().status === 'aprovado') {
      usuarioAtualNome = user.displayName || docSnap.data().nome;
      document.getElementById('user-name').innerText = usuarioAtualNome;

      if (user.email === EMAIL_ADMIN) {
        isAdmin = true;
        document.getElementById('menu-admin').classList.remove('hidden');
        document.getElementById('user-role').innerText = "Presidente / Admin";
        document.getElementById('user-role').classList.replace('text-[var(--color-primary)]', 'text-red-400');
      }
      
      injetarGradeDeAulas();
      escutarPainelDados(); 
      escutarForum();       
      carregarHub();       
      escutarCalendarioGlobal(); // Ativa o Radar e Tarefas do Dia!
      renderizarCalendario(); // Cria a visualização da Agenda
    } else { window.location.href = "index.html"; }
  } else { window.location.href = "index.html"; }
});

// Injeta as aulas baseadas no dia do computador
function injetarGradeDeAulas() {
  const diaSemana = new Date().getDay(); // 0 a 6
  const rotinaHoje = gradeAulas[diaSemana];
  
  document.getElementById('dash-dia').innerText = rotinaHoje.dia;
  const listaAulas = document.getElementById('dash-lista-aulas');
  listaAulas.innerHTML = '';

  if (rotinaHoje.aulas.length === 0) {
    listaAulas.innerHTML = `<li class="text-center text-[var(--text-muted)] py-4 font-bold border border-dashed border-[var(--border-dark)] rounded-lg">Fim de semana! Aproveite o descanso.</li>`;
  } else {
    rotinaHoje.aulas.forEach(aula => {
      listaAulas.innerHTML += `<li class="flex justify-between items-center border-b border-[var(--border-dark)] pb-2"><span class="text-[var(--text-muted)]">${aula.hora}</span><span class="font-semibold text-white truncate max-w-[150px] sm:max-w-xs text-right" title="${aula.nome}">${aula.nome}</span></li>`;
    });
  }
}

// ==========================================
// 2. ROTEAMENTO SPA (Telas)
// ==========================================
const views = ['dashboard', 'hub', 'calendario', 'forum', 'admin'];
const navs = {
  'dashboard': { btn: 'nav-inicio', titulo: 'Visão Geral' },
  'hub': { btn: 'nav-hub', titulo: '<i class="fa-solid fa-layer-group mr-2 text-[var(--color-blue)]"></i> Hub de Editais IFPR' },
  'calendario': { btn: 'nav-calendario', titulo: '<i class="fa-regular fa-calendar-days mr-2 text-[var(--color-blue)]"></i> Agenda Letiva' },
  'forum': { btn: 'nav-forum', titulo: '<i class="fa-solid fa-comments mr-2 text-[var(--color-blue)]"></i> Fórum da Turma' },
  'admin': { btn: 'nav-admin', titulo: '<span class="text-red-500"><i class="fa-solid fa-crown mr-2"></i> Liderança</span>' }
};

function trocarTela(telaAtiva) {
  views.forEach(view => {
    let el = document.getElementById(`view-${view}`);
    if(view === telaAtiva) { el.classList.remove('hidden'); el.classList.add(view==='forum'||view==='calendario'||view==='hub' ? 'flex' : 'block'); }
    else { el.classList.add('hidden'); el.classList.remove('flex', 'block'); }
    
    const btn = document.getElementById(navs[view].btn);
    if(btn) {
      if(view === telaAtiva && view !== 'admin') { btn.classList.add('bg-[var(--color-blue)]', 'text-white'); btn.classList.remove('text-[var(--text-muted)]', 'hover:bg-[#2a2a2e]'); }
      else if(view === telaAtiva && view === 'admin') { btn.classList.add('bg-red-500/10', 'text-white'); btn.classList.remove('text-red-400'); }
      else if(view !== 'admin') { btn.classList.remove('bg-[var(--color-blue)]', 'text-white'); btn.classList.add('text-[var(--text-muted)]', 'hover:bg-[#2a2a2e]'); }
      else { btn.classList.remove('bg-red-500/10', 'text-white'); btn.classList.add('text-red-400'); }
    }
  });
  document.getElementById('titulo-pagina').innerHTML = navs[telaAtiva].titulo;
  if(telaAtiva === 'admin') carregarAlunos();
}

document.getElementById('nav-inicio').addEventListener('click', (e) => { e.preventDefault(); trocarTela('dashboard'); });
document.getElementById('nav-hub').addEventListener('click', (e) => { e.preventDefault(); trocarTela('hub'); });
document.getElementById('nav-calendario').addEventListener('click', (e) => { e.preventDefault(); trocarTela('calendario'); });
document.getElementById('nav-forum').addEventListener('click', (e) => { e.preventDefault(); trocarTela('forum'); });
document.getElementById('nav-admin').addEventListener('click', (e) => { e.preventDefault(); trocarTela('admin'); });

function formatarTextoComLinks(texto) { return texto.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-[var(--color-blue)] hover:underline font-bold"><i class="fa-solid fa-link"></i> Link</a>'); }
function getCorTag(categoria) {
  if(categoria === 'Bolsa/Auxílio') return 'text-green-400 bg-green-500/10 border-green-500/30';
  if(categoria === 'Evento') return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
  if(categoria === 'Estágio/Emprego') return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'; 
}

// ==========================================
// 3. HUB DE EDITAIS
// ==========================================
function carregarHub() {
  const q = query(collection(db, "hub_editais"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snapshot) => {
    const lista = document.getElementById('lista-hub'); lista.innerHTML = '';
    const bannerTag = document.getElementById('banner-tag'); const bannerTitulo = document.getElementById('banner-titulo'); const bannerTexto = document.getElementById('banner-texto'); const bannerBtn = document.getElementById('banner-btn-link');
    if(snapshot.empty) { 
      lista.innerHTML = '<div class="text-[var(--text-muted)] text-sm">Nenhum edital na vitrine.</div>'; 
      bannerTag.innerHTML = '<i class="fa-solid fa-rocket mr-1"></i> PLATAFORMA CORE'; bannerTitulo.innerText = "Bem-vindo à sua central."; bannerTexto.innerText = "Acompanhe a rotina da turma, acesse fóruns e fique por dentro dos editais."; bannerBtn.classList.add('hidden');
      return; 
    }
    const ultimoPost = snapshot.docs[0].data();
    bannerTag.innerHTML = `<i class="fa-solid fa-thumbtack mr-1"></i> DESTAQUE: ${ultimoPost.categoria.toUpperCase()}`;
    bannerTitulo.innerText = ultimoPost.titulo; bannerTexto.innerText = ultimoPost.texto;
    if(ultimoPost.link) { bannerBtn.href = ultimoPost.link; bannerBtn.classList.remove('hidden'); bannerBtn.classList.add('inline-flex'); } else { bannerBtn.classList.add('hidden'); }

    snapshot.forEach((doc) => {
      const post = doc.data(); const dataStr = post.timestamp ? new Date(post.timestamp.toDate()).toLocaleDateString('pt-BR', {day:'2-digit', month:'short', year:'numeric'}) : 'Agora'; const cssTag = getCorTag(post.categoria);
      let btnLink = post.link ? `<a href="${post.link}" target="_blank" class="mt-4 inline-flex items-center gap-2 bg-[var(--color-blue)] hover:bg-[#0f4396] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors"><i class="fa-solid fa-link"></i> Acessar Edital Oficial</a>` : '';
      lista.innerHTML += `<article class="bg-[var(--bg-card)] border border-[var(--border-dark)] rounded-xl p-6 shadow-sm"><div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3"><h2 class="text-xl font-bold text-white">${post.titulo}</h2><span class="text-xs font-bold px-3 py-1 rounded-full border self-start sm:self-center ${cssTag}">${post.categoria}</span></div><p class="text-[var(--text-muted)] text-sm whitespace-pre-wrap leading-relaxed mb-4">${formatarTextoComLinks(post.texto)}</p>${btnLink}<div class="text-xs text-gray-500 font-semibold border-t border-[var(--border-dark)] pt-3 mt-4"><i class="fa-regular fa-calendar mr-1"></i> Lançado na Vitrine em ${dataStr}</div></article>`;
    });
  });
}
window.postarHub = async () => {
  const titulo = document.getElementById('hub-titulo').value.trim(); const categoria = document.getElementById('hub-categoria').value; const texto = document.getElementById('hub-texto').value.trim(); const link = document.getElementById('hub-link').value.trim();
  if(!titulo || !texto) { alert("Preencha título e o resumo."); return; }
  try { await addDoc(collection(db, "hub_editais"), { titulo, categoria, texto, link, timestamp: serverTimestamp() }); document.getElementById('hub-titulo').value = ''; document.getElementById('hub-texto').value = ''; document.getElementById('hub-link').value = ''; alert("✅ Edital lançado!"); } catch(e) { alert("Erro."); }
};

// ==========================================
// 4. O CÉREBRO DO CALENDÁRIO E DO RADAR!
// ==========================================
// Essa função escuta todo o banco de calendário e atualiza a tela Inicial (Tarefas de Hoje e Radar)
function escutarCalendarioGlobal() {
  onSnapshot(collection(db, "calendario"), (snapshot) => {
    let eventos = {};
    snapshot.forEach(doc => { eventos[doc.id] = doc.data().texto; }); // Guarda tudo ex: { "2026-2-22": "Prova" }

    const hoje = new Date();
    const anoH = hoje.getFullYear(); const mesH = hoje.getMonth(); const diaH = hoje.getDate();
    
    // 1. CHECA TAREFAS DE HOJE
    const idHoje = `${anoH}-${mesH}-${diaH}`;
    const tagHoje = document.getElementById('dash-tarefa');
    if (eventos[idHoje]) {
      tagHoje.innerHTML = `<span class="bg-yellow-500 text-black px-2 py-1 rounded shadow-sm">${eventos[idHoje]}</span>`;
    } else {
      tagHoje.innerHTML = "Nenhuma atividade extra lançada.";
    }

    // 2. LIGA O RADAR (Varre os próximos 7 dias)
    let achouEventoNoRadar = false;
    let textoRadar = "";

    for(let i = 1; i <= 7; i++) {
      let dataFutura = new Date();
      dataFutura.setDate(hoje.getDate() + i); // Soma os dias
      
      let idFuturo = `${dataFutura.getFullYear()}-${dataFutura.getMonth()}-${dataFutura.getDate()}`;
      if(eventos[idFuturo]) {
        let diaFormatado = `${String(dataFutura.getDate()).padStart(2, '0')}/${String(dataFutura.getMonth() + 1).padStart(2, '0')}`;
        textoRadar += `<strong class="text-white">${diaFormatado}:</strong> ${eventos[idFuturo]} <br>`;
        achouEventoNoRadar = true;
      }
    }

    const radarContainer = document.getElementById('radar-container');
    const radarTexto = document.getElementById('radar-texto');
    
    if (achouEventoNoRadar) {
      radarTexto.innerHTML = textoRadar;
      radarContainer.classList.remove('hidden');
    } else {
      radarContainer.classList.add('hidden');
    }
  });
}

// ==========================================
// 5. CALENDÁRIO VISUAL
// ==========================================
let mesAtual = new Date().getMonth(); let anoAtual = new Date().getFullYear(); 
const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function renderizarCalendario() {
  const grid = document.getElementById('calendario-grade');
  const titulo = document.getElementById('mes-atual-titulo');
  titulo.innerText = `${mesesNomes[mesAtual]} ${anoAtual}`;
  const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay();
  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const hoje = new Date();
  
  onSnapshot(collection(db, "calendario"), (snapshot) => {
    let eventosMes = {}; snapshot.forEach(doc => { eventosMes[doc.id] = doc.data().texto; });
    grid.innerHTML = ''; 
    for (let i = 0; i < primeiroDia; i++) grid.innerHTML += `<div class="bg-transparent border border-transparent"></div>`; 

    for (let dia = 1; dia <= diasNoMes; dia++) {
      let dataId = `${anoAtual}-${mesAtual}-${dia}`;
      let temEvento = eventosMes[dataId];
      let ehHoje = (dia === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear());
      let corFundo = ehHoje ? 'bg-[var(--color-blue)] border-[var(--color-blue)]' : 'bg-[#2a2a2e] border-[var(--border-dark)] hover:border-[var(--color-blue)]';
      let tagHTML = temEvento ? `<div class="mt-1 text-[10px] sm:text-xs leading-tight font-bold bg-yellow-500 text-black px-1 rounded line-clamp-2">${temEvento}</div>` : '';
      let clickEvent = isAdmin ? `onclick="addEventoCalendario('${dataId}', '${dia}/${mesAtual+1}/${anoAtual}', '${temEvento || ''}')"` : '';
      let cursorClass = isAdmin ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all' : '';

      grid.innerHTML += `<div ${clickEvent} class="border rounded p-1 sm:p-2 flex flex-col ${corFundo} ${cursorClass}"><span class="font-bold text-xs sm:text-sm text-right ${ehHoje ? 'text-white' : 'text-gray-300'}">${dia}</span>${tagHTML}</div>`;
    }
  });
}
window.addEventoCalendario = async (docId, dataFormatada, eventoAtual) => {
  const novoEvento = prompt(`Liderança: Adicionar evento para ${dataFormatada}:\n(Deixe em branco e dê OK para apagar o atual)`, eventoAtual);
  if (novoEvento !== null) { 
    if (novoEvento.trim() === "") await deleteDoc(doc(db, "calendario", docId)); 
    else await setDoc(doc(db, "calendario", docId), { texto: novoEvento.substring(0, 40) }); 
  }
};
document.getElementById('btn-mes-ant').addEventListener('click', () => { mesAtual--; if(mesAtual < 0) { mesAtual = 11; anoAtual--; } renderizarCalendario(); });
document.getElementById('btn-mes-prox').addEventListener('click', () => { mesAtual++; if(mesAtual > 11) { mesAtual = 0; anoAtual++; } renderizarCalendario(); });

// ==========================================
// 6. CHAT, DASHBOARD DIÁRIO E ALUNOS
// ==========================================
function escutarForum() {
  const q = query(collection(db, "forum_mensagens"), orderBy("timestamp", "asc"));
  onSnapshot(q, (snapshot) => {
    const chatBox = document.getElementById('chat-box'); chatBox.innerHTML = '';
    if(snapshot.empty) { chatBox.innerHTML = '<div class="text-center text-[var(--text-muted)] mt-10">Mande o primeiro salve da turma!</div>'; return; }
    snapshot.forEach((doc) => {
      const msg = doc.data(); const isMe = msg.autor === usuarioAtualNome;
      chatBox.innerHTML += `<div class="mb-3"><div class="inline-block p-3 rounded-xl border ${isMe ? 'bg-[var(--color-blue)]/10 border-[var(--color-blue)]/30' : 'bg-[#2a2a2e] border-[var(--border-dark)]'} text-sm"><span class="font-bold text-xs block mb-1 ${isMe ? 'text-[var(--color-blue)]' : 'text-[var(--color-primary)]'}">${msg.autor}</span><span class="text-white">${formatarTextoComLinks(msg.texto)}</span></div></div>`;
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}
window.enviarMensagem = async () => {
  const input = document.getElementById('chat-input'); const texto = input.value.trim(); if(!texto) return;
  try { input.value = ''; await addDoc(collection(db, "forum_mensagens"), { texto: texto, autor: usuarioAtualNome, timestamp: serverTimestamp() }); } catch(e) {}
};

function escutarPainelDados() {
  onSnapshot(doc(db, "painel_dados", "geral"), (documento) => {
    if (documento.exists()) {
      const dados = documento.data();
      document.getElementById('dash-aviso-titulo').innerText = dados.aviso_titulo || 'Aviso'; document.getElementById('dash-aviso-texto').innerText = dados.aviso_texto || '...';
      const vCafe = parseFloat(dados.cafe_valor) || 0; const mCafe = parseFloat(dados.cafe_meta) || 1; let p = (vCafe / mCafe) * 100; if (p > 100) p = 100;
      document.getElementById('dash-cafe-valor').innerText = `R$ ${vCafe}`; document.getElementById('dash-cafe-meta').innerText = `Meta: R$ ${mCafe}`; document.getElementById('dash-cafe-barra').style.width = `${p}%`;
      
      document.getElementById('edit-aviso-titulo').value = dados.aviso_titulo || ''; document.getElementById('edit-aviso-texto').value = dados.aviso_texto || '';
      document.getElementById('edit-cafe-valor').value = dados.cafe_valor || ''; document.getElementById('edit-cafe-meta').value = dados.cafe_meta || '';
    }
  });
}

// Salva apenas os avisos e o café (As aulas agora são 100% automáticas!)
window.salvarPainel = async () => {
  const dados = { aviso_titulo: document.getElementById('edit-aviso-titulo').value, aviso_texto: document.getElementById('edit-aviso-texto').value, cafe_valor: document.getElementById('edit-cafe-valor').value, cafe_meta: document.getElementById('edit-cafe-meta').value };
  try { await setDoc(doc(db, "painel_dados", "geral"), dados, { merge: true }); alert("🚀 Painel atualizado para todos!"); } catch (e) {}
};

async function carregarAlunos() {
  const lista = document.getElementById('lista-pendentes');
  try {
    const qs = await getDocs(collection(db, "alunos")); lista.innerHTML = ''; 
    qs.forEach((d) => {
      const a = d.data(); const id = d.id; const tr = document.createElement('tr'); tr.className = "border-t border-[var(--border-dark)] hover:bg-[#2a2a2e]/50";
      let bStatus = a.status === 'aprovado' ? `<span class="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">Aprovado</span>` : `<span class="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-bold">Pendente</span>`;
      let btn = a.status === 'pendente' 
        ? `<button onclick="aprovarAluno('${id}')" class="bg-[var(--color-primary)] text-white w-8 h-8 rounded"><i class="fa-solid fa-check"></i></button><button onclick="removerAluno('${id}')" class="bg-red-500 text-white w-8 h-8 rounded"><i class="fa-solid fa-xmark"></i></button>`
        : `<button onclick="editarNome('${id}', '${a.nome}')" class="bg-[var(--color-blue)] text-white w-8 h-8 rounded"><i class="fa-solid fa-pen"></i></button><button onclick="resetarSenha('${a.email}')" class="bg-purple-500 text-white w-8 h-8 rounded"><i class="fa-solid fa-key"></i></button><button onclick="removerAluno('${id}')" class="bg-red-500/20 text-red-400 w-8 h-8 rounded"><i class="fa-solid fa-trash"></i></button>`;
      
      // Adicionado a coluna de E-mail (Oculta no mobile, aparece em telas maiores)
      tr.innerHTML = `<td class="p-4 font-bold text-white">${a.nome}</td><td class="p-4 text-[var(--text-muted)] text-xs hidden sm:table-cell">${a.email}</td><td class="p-4 text-center">${bStatus}</td><td class="p-4 text-center flex justify-center gap-2">${btn}</td>`;
      lista.appendChild(tr);
    });
  } catch (e) {}
}
window.aprovarAluno = async (id) => { if(confirm("Liberar?")) { await updateDoc(doc(db, "alunos", id), { status: 'aprovado' }); carregarAlunos(); } };
window.removerAluno = async (id) => { if(confirm("Apagar?")) { await deleteDoc(doc(db, "alunos", id)); carregarAlunos(); } };
window.editarNome = async (id, nAtual) => { const n = prompt("Nome:", nAtual); if (n && n !== nAtual) { await updateDoc(doc(db, "alunos", id), { nome: n }); carregarAlunos(); } };
window.resetarSenha = async (email) => { if(confirm(`Reset para ${email}?`)) { await sendPasswordResetEmail(auth, email); alert("Enviado!"); } };
document.getElementById('btn-sair').addEventListener('click', async () => { await signOut(auth); window.location.href = "index.html"; });
// ==========================================
// UX MOBILE: CONTROLE DO MENU HAMBÚRGUER
// ==========================================
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('mobile-overlay');
const btnAbrir = document.getElementById('btn-abrir-menu');
const btnFechar = document.getElementById('btn-fechar-menu');

// Função que abre/fecha a gaveta
function toggleMenu() {
  if (sidebar && overlay) {
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
  }
}

// Ouvintes de clique
if (btnAbrir) btnAbrir.addEventListener('click', toggleMenu);
if (btnFechar) btnFechar.addEventListener('click', toggleMenu);
if (overlay) overlay.addEventListener('click', toggleMenu); // Fecha se clicar no fundo escuro

// Fecha o menu automaticamente no celular ao clicar em qualquer item da navegação
document.querySelectorAll('aside nav a').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth < 768 && !sidebar.classList.contains('-translate-x-full')) {
      toggleMenu();
    }
  });
});