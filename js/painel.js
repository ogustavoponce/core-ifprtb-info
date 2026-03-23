import { onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, updateDoc, deleteDoc, setDoc, addDoc, onSnapshot, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const EMAIL_ADMIN = "gustavo.ponce.ifpr@gmail.com"; 
let usuarioAtualNome = "Aluno"; 
let usuarioAtualFoto = "assets/img/default-avatar.png";
let isAdmin = false;

// ==========================================
// 1. O CÉREBRO: PILOTO AUTOMÁTICO DE AULAS
// ==========================================
const GRADE_DE_AULAS_FIXA = {
  1: { dia: "Segunda-feira", a1: "Lógica de Prog.", a2: "Design Web" },
  2: { dia: "Terça-feira",   a1: "Banco de Dados", a2: "Redes" },
  3: { dia: "Quarta-feira",  a1: "Matemática",     a2: "Inglês" },
  4: { dia: "Quinta-feira",  a1: "Empreendedorismo", a2: "Projetos" },
  5: { dia: "Sexta-feira",   a1: "Sistemas",       a2: "Hardware" }
};

// ==========================================
// 2. INICIALIZAÇÃO & UX MOBILE
// ==========================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "alunos", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().status === 'aprovado') {
      usuarioAtualNome = user.displayName || docSnap.data().nome;
      
      // MAGIA DA FOTO DE PERFIL 📸
      usuarioAtualFoto = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(usuarioAtualNome)}&background=1351b4&color=fff&size=128&bold=true`;
      
      const elNome = document.getElementById('user-name');
      const elFoto = document.getElementById('user-photo');
      if(elNome) elNome.innerText = usuarioAtualNome;
      if(elFoto) elFoto.src = usuarioAtualFoto;

      if (user.email === EMAIL_ADMIN) {
        isAdmin = true;
        const menuAdmin = document.getElementById('menu-admin');
        const userRole = document.getElementById('user-role');
        if(menuAdmin) menuAdmin.classList.remove('hidden');
        if(userRole) {
          userRole.innerText = "Presidente / Admin";
          userRole.classList.replace('text-[var(--color-primary)]', 'text-red-400');
        }
      }
      
      injetarPilotoAutomatico();
      escutarPainelDados(); 
      escutarForum();       
      carregarHub();       
      renderizarCalendario(); 
    } else { window.location.href = "index.html"; }
  } else { window.location.href = "index.html"; }
});

// MENU HAMBÚRGUER MOBILE
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('mobile-overlay');
const btnAbrir = document.getElementById('btn-abrir-menu');
const btnFechar = document.getElementById('btn-fechar-menu');

function toggleMenu() {
  if (sidebar && overlay) {
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
  }
}
if (btnAbrir) btnAbrir.addEventListener('click', toggleMenu);
if (btnFechar) btnFechar.addEventListener('click', toggleMenu);
if (overlay) overlay.addEventListener('click', toggleMenu);

// ==========================================
// 3. ROTEAMENTO SPA (Telas)
// ==========================================
const views = ['dashboard', 'hub', 'calendario', 'forum', 'admin'];
const navs = {
  'dashboard': { btn: 'nav-inicio', titulo: 'Visão Geral' },
  'hub': { btn: 'nav-hub', titulo: 'Hub de Editais' },
  'calendario': { btn: 'nav-calendario', titulo: 'Agenda Letiva' },
  'forum': { btn: 'nav-forum', titulo: 'Fórum da Turma' },
  'admin': { btn: 'nav-admin', titulo: '<span class="text-red-500"><i class="fa-solid fa-crown mr-2"></i> Liderança</span>' }
};

function trocarTela(telaAtiva) {
  views.forEach(view => {
    let el = document.getElementById(`view-${view}`);
    if(!el) return;
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
  const tPagina = document.getElementById('titulo-pagina');
  if(tPagina) tPagina.innerHTML = navs[telaAtiva].titulo;
  
  if(window.innerWidth < 768 && sidebar && !sidebar.classList.contains('-translate-x-full')) toggleMenu(); 
  if(telaAtiva === 'admin') carregarAlunos();
  if(telaAtiva === 'forum') { const cb = document.getElementById('chat-box'); if(cb) cb.scrollTop = cb.scrollHeight; }
}

document.querySelectorAll('aside nav a').forEach(btn => {
  btn.addEventListener('click', (e) => { e.preventDefault(); trocarTela(e.currentTarget.id.replace('nav-', '')); });
});

function formatarLinks(texto) { return texto.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-[var(--color-blue)] hover:underline font-bold">Link</a>'); }

// ==========================================
// 4. PILOTO AUTOMÁTICO & RADAR
// ==========================================
function injetarPilotoAutomatico() {
  const diaSemana = new Date().getDay();
  const ulGrade = document.getElementById('dash-lista-aulas');
  const dashDia = document.getElementById('dash-dia');
  
  if (diaSemana >= 1 && diaSemana <= 5) {
    const hoje = GRADE_DE_AULAS_FIXA[diaSemana];
    if(dashDia) dashDia.innerText = hoje.dia;
    if(ulGrade) ulGrade.innerHTML = `
      <li class="flex justify-between items-center border-b border-[var(--border-dark)] pb-2"><span class="text-[var(--text-muted)]">19:00 - 20:30</span><span class="font-bold text-white">${hoje.a1}</span></li>
      <li class="flex justify-between items-center border-b border-[var(--border-dark)] pb-2 pt-1"><span class="text-[var(--text-muted)]">20:45 - 22:30</span><span class="font-bold text-white">${hoje.a2}</span></li>
    `;
  } else {
    if(dashDia) dashDia.innerText = "Fim de Semana";
    if(ulGrade) ulGrade.innerHTML = `<li class="text-center text-[var(--text-muted)] text-xs py-2 italic">Nenhuma aula programada hoje. Descanse!</li>`;
  }
}

function processarRadarTarefas(eventosBanco) {
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  
  let tarefaDeHoje = null;
  let eventoFuturo = null;
  let diasParaEvento = 999;

  for (const [dataId, textoEvento] of Object.entries(eventosBanco)) {
    const partes = dataId.split('-'); 
    const dataEvento = new Date(partes[0], partes[1], partes[2]);
    const diffTempo = dataEvento.getTime() - hoje.getTime();
    const diffDias = Math.ceil(diffTempo / (1000 * 3600 * 24));

    if (diffDias === 0) {
      tarefaDeHoje = textoEvento;
    } else if (diffDias > 0 && diffDias <= 7) { 
      if (diffDias < diasParaEvento) {
        diasParaEvento = diffDias;
        eventoFuturo = { texto: textoEvento, dias: diffDias, dataFormatada: `${partes[2]}/${parseInt(partes[1])+1}` };
      }
    }
  }

  const dashTarefa = document.getElementById('dash-tarefa');
  const dashRadar = document.getElementById('radar-container');
  const dashRadarTexto = document.getElementById('radar-texto');

  if(dashTarefa) {
    if (tarefaDeHoje) dashTarefa.innerHTML = `<span class="text-yellow-400"><i class="fa-solid fa-thumbtack mr-1"></i> ${tarefaDeHoje}</span>`;
    else dashTarefa.innerHTML = `<span class="text-[var(--text-muted)] font-normal">Nenhuma atividade hoje.</span>`;
  }

  if(dashRadar && dashRadarTexto) {
    if (eventoFuturo) {
      dashRadar.classList.remove('hidden');
      let diaTxt = eventoFuturo.dias === 1 ? 'AMANHÃ' : `em ${eventoFuturo.dias} dias`;
      dashRadarTexto.innerText = `${eventoFuturo.texto} (${diaTxt} - ${eventoFuturo.dataFormatada})`;
    } else {
      dashRadar.classList.add('hidden');
    }
  }
}

// ==========================================
// 5. CALENDÁRIO 2026 E HUB
// ==========================================
let mesAtual = new Date().getMonth(); let anoAtual = new Date().getFullYear(); 
const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function renderizarCalendario() {
  const grid = document.getElementById('calendario-grade');
  const tMes = document.getElementById('mes-atual-titulo');
  if(tMes) tMes.innerText = `${mesesNomes[mesAtual]} ${anoAtual}`;
  
  const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay();
  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const hoje = new Date();
  
  onSnapshot(collection(db, "calendario"), (snapshot) => {
    let eventosMes = {};
    snapshot.forEach(doc => { eventosMes[doc.id] = doc.data().texto; });
    
    processarRadarTarefas(eventosMes);

    if(grid) {
        grid.innerHTML = ''; 
        for (let i = 0; i < primeiroDia; i++) grid.innerHTML += `<div></div>`; 

        for (let dia = 1; dia <= diasNoMes; dia++) {
          let dataId = `${anoAtual}-${mesAtual}-${dia}`;
          let temEvento = eventosMes[dataId];
          let ehHoje = (dia === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear());
          let corFundo = ehHoje ? 'bg-[var(--color-blue)] border-[var(--color-blue)]' : 'bg-[#2a2a2e] border-[var(--border-dark)] hover:border-[var(--color-blue)]';
          let tagHTML = temEvento ? `<div class="mt-1 text-[8px] sm:text-[10px] leading-tight font-bold bg-yellow-500 text-black px-1 rounded line-clamp-2">${temEvento}</div>` : '';
          let clickEvent = isAdmin ? `onclick="addEventoCalendario('${dataId}', '${dia}/${mesAtual+1}', '${temEvento || ''}')"` : '';
          let cursorClass = isAdmin ? 'cursor-pointer hover:-translate-y-1 transition-transform' : '';

          grid.innerHTML += `<div ${clickEvent} class="border rounded p-1 flex flex-col ${corFundo} ${cursorClass}"><span class="font-bold text-[10px] sm:text-xs text-right ${ehHoje ? 'text-white' : 'text-gray-300'}">${dia}</span>${tagHTML}</div>`;
        }
    }
  });
}
window.addEventoCalendario = async (docId, dataFormatada, eventoAtual) => {
  const novoEvento = prompt(`Liderança: Lançar atividade para ${dataFormatada}:\n(Deixe vazio para apagar)`, eventoAtual);
  if (novoEvento !== null) { 
    if (novoEvento.trim() === "") await deleteDoc(doc(db, "calendario", docId)); 
    else await setDoc(doc(db, "calendario", docId), { texto: novoEvento.substring(0, 40) }); 
  }
};
if(document.getElementById('btn-mes-ant')) document.getElementById('btn-mes-ant').addEventListener('click', () => { mesAtual--; if(mesAtual < 0) { mesAtual = 11; anoAtual--; } renderizarCalendario(); });
if(document.getElementById('btn-mes-prox')) document.getElementById('btn-mes-prox').addEventListener('click', () => { mesAtual++; if(mesAtual > 11) { mesAtual = 0; anoAtual++; } renderizarCalendario(); });

function carregarHub() {
  onSnapshot(query(collection(db, "hub_editais"), orderBy("timestamp", "desc")), (snapshot) => {
    const lista = document.getElementById('lista-hub'); 
    if(lista) lista.innerHTML = '';
    
    const bTag = document.getElementById('banner-tag'); const bTit = document.getElementById('banner-titulo'); const bTex = document.getElementById('banner-texto'); const bBtn = document.getElementById('banner-btn-link');

    if(snapshot.empty) { 
      if(lista) lista.innerHTML = '<div class="text-[var(--text-muted)] text-sm">Nenhum edital na vitrine.</div>'; 
      if(bTag) bTag.innerHTML = '<i class="fa-solid fa-rocket mr-1"></i> PLATAFORMA CORE'; 
      if(bTit) bTit.innerText = "Bem-vindo à sua central."; 
      if(bTex) bTex.innerText = "Acompanhe a rotina da turma, acesse os fóruns e editais."; 
      if(bBtn) bBtn.classList.add('hidden');
      return; 
    }
    
    const uPost = snapshot.docs[0].data();
    if(bTag) {
      bTag.innerHTML = `<i class="fa-solid fa-thumbtack mr-1"></i> ${uPost.categoria.toUpperCase()}`; 
      bTit.innerText = uPost.titulo; 
      bTex.innerText = uPost.texto;
      if(uPost.link) { bBtn.href = uPost.link; bBtn.classList.remove('hidden'); bBtn.classList.add('inline-flex'); } else { bBtn.classList.add('hidden'); }
    }

    if(lista) {
        snapshot.forEach((doc) => {
          const p = doc.data(); const dStr = p.timestamp ? new Date(p.timestamp.toDate()).toLocaleDateString('pt-BR') : 'Agora';
          let cTag = p.categoria==='Bolsa/Auxílio'?'text-green-400 bg-green-500/10':p.categoria==='Evento'?'text-purple-400 bg-purple-500/10':p.categoria==='Estágio/Emprego'?'text-blue-400 bg-blue-500/10':'text-yellow-400 bg-yellow-500/10';
          let btn = p.link ? `<a href="${p.link}" target="_blank" class="mt-3 inline-flex items-center gap-2 bg-[var(--color-blue)] hover:bg-[#0f4396] text-white px-4 py-2 rounded text-xs font-bold transition-colors"><i class="fa-solid fa-link"></i> Edital Oficial</a>` : '';
          lista.innerHTML += `<article class="bg-[var(--bg-card)] border border-[var(--border-dark)] rounded-xl p-4 sm:p-5 shadow-sm"><div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2"><h2 class="text-base sm:text-lg font-bold text-white leading-tight">${p.titulo}</h2><span class="text-[10px] font-bold px-2 py-1 rounded-full self-start sm:self-center shrink-0 ${cTag}">${p.categoria}</span></div><p class="text-[var(--text-muted)] text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">${p.texto}</p>${btn}<div class="text-[10px] text-gray-500 font-bold border-t border-[var(--border-dark)] pt-2 mt-3"><i class="fa-regular fa-calendar mr-1"></i> Lançado em ${dStr}</div></article>`;
        });
    }
  });
}
window.postarHub = async () => {
  const t = document.getElementById('hub-titulo').value.trim(); const c = document.getElementById('hub-categoria').value; const txt = document.getElementById('hub-texto').value.trim(); const l = document.getElementById('hub-link').value.trim();
  if(!t || !txt) { alert("Preencha título e resumo."); return; }
  try { await addDoc(collection(db, "hub_editais"), { titulo: t, categoria: c, texto: txt, link: l, timestamp: serverTimestamp() }); document.getElementById('hub-titulo').value=''; document.getElementById('hub-texto').value=''; document.getElementById('hub-link').value=''; alert("✅ Edital no Hub!"); } catch(e) {}
};

// ==========================================
// 6. FÓRUM
// ==========================================
function escutarForum() {
  onSnapshot(query(collection(db, "forum_mensagens"), orderBy("timestamp", "asc")), (snapshot) => {
    const chatBox = document.getElementById('chat-box'); 
    if(!chatBox) return;
    chatBox.innerHTML = '';
    
    if(snapshot.empty) { chatBox.innerHTML = '<div class="text-center text-[var(--text-muted)] mt-10">Mande o primeiro salve da turma!</div>'; return; }
    snapshot.forEach((doc) => {
      const msg = doc.data(); const isMe = msg.autor === usuarioAtualNome;
      chatBox.innerHTML += `<div class="mb-3"><div class="inline-block p-3 rounded-xl border ${isMe ? 'bg-[var(--color-blue)]/10 border-[var(--color-blue)]/30' : 'bg-[#2a2a2e] border-[var(--border-dark)]'} text-sm"><span class="font-bold text-xs block mb-1 ${isMe ? 'text-[var(--color-blue)]' : 'text-[var(--color-primary)]'}">${msg.autor}</span><span class="text-white">${formatarLinks(msg.texto)}</span></div></div>`;
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
      if(document.getElementById('dash-aviso-titulo')) document.getElementById('dash-aviso-titulo').innerText = dados.aviso_titulo || 'Aviso'; 
      if(document.getElementById('dash-aviso-texto')) document.getElementById('dash-aviso-texto').innerHTML = formatarLinks(dados.aviso_texto || '...');
      
      const vCafe = parseFloat(dados.cafe_valor) || 0; const mCafe = parseFloat(dados.cafe_meta) || 1; let p = (vCafe / mCafe) * 100; if (p > 100) p = 100;
      if(document.getElementById('dash-cafe-valor')) document.getElementById('dash-cafe-valor').innerText = `R$ ${vCafe}`; 
      if(document.getElementById('dash-cafe-meta')) document.getElementById('dash-cafe-meta').innerText = `Meta: R$ ${mCafe}`; 
      if(document.getElementById('dash-cafe-barra')) document.getElementById('dash-cafe-barra').style.width = `${p}%`;
      
      if(document.getElementById('edit-aviso-titulo')) document.getElementById('edit-aviso-titulo').value = dados.aviso_titulo || ''; 
      if(document.getElementById('edit-aviso-texto')) document.getElementById('edit-aviso-texto').value = dados.aviso_texto || '';
      if(document.getElementById('edit-cafe-valor')) document.getElementById('edit-cafe-valor').value = dados.cafe_valor || ''; 
      if(document.getElementById('edit-cafe-meta')) document.getElementById('edit-cafe-meta').value = dados.cafe_meta || '';
    }
  });
}
window.salvarPainel = async () => {
  const dados = { aviso_titulo: document.getElementById('edit-aviso-titulo').value, aviso_texto: document.getElementById('edit-aviso-texto').value, cafe_valor: document.getElementById('edit-cafe-valor').value, cafe_meta: document.getElementById('edit-cafe-meta').value };
  try { await setDoc(doc(db, "painel_dados", "geral"), dados, { merge: true }); alert("🚀 Fundo e Avisos atualizados!"); } catch (e) {}
};

async function carregarAlunos() {
  const lista = document.getElementById('lista-pendentes');
  if(!lista) return;
  try {
    const qs = await getDocs(collection(db, "alunos")); lista.innerHTML = ''; 
    qs.forEach((d) => {
      const a = d.data(); const id = d.id; const tr = document.createElement('tr'); tr.className = "border-t border-[var(--border-dark)] hover:bg-[#2a2a2e]/50";
      let bStatus = a.status === 'aprovado' ? `<span class="bg-green-500/20 text-green-400 px-2 py-1 rounded text-[10px] font-bold">Aprovado</span>` : `<span class="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-[10px] font-bold animate-pulse">Pendente</span>`;
      let btn = a.status === 'pendente' 
        ? `<button onclick="aprovarAluno('${id}')" class="bg-[var(--color-primary)] text-white w-7 h-7 rounded"><i class="fa-solid fa-check"></i></button><button onclick="removerAluno('${id}')" class="bg-red-500 text-white w-7 h-7 rounded"><i class="fa-solid fa-xmark"></i></button>`
        : `<button onclick="resetarSenha('${a.email}')" class="bg-purple-500 text-white w-7 h-7 rounded"><i class="fa-solid fa-key text-xs"></i></button><button onclick="removerAluno('${id}')" class="bg-red-500/20 text-red-400 w-7 h-7 rounded"><i class="fa-solid fa-trash text-xs"></i></button>`;
      tr.innerHTML = `<td class="p-3 sm:p-4"><div class="font-bold text-white leading-tight">${a.nome}</div><div class="text-[10px] sm:text-xs text-[var(--text-muted)] mt-0.5">${a.email}</div></td><td class="p-3 sm:p-4 text-center">${bStatus}</td><td class="p-3 sm:p-4 text-center flex justify-center gap-1.5">${btn}</td>`;
      lista.appendChild(tr);
    });
  } catch (e) {}
}
window.aprovarAluno = async (id) => { if(confirm("Liberar?")) { await updateDoc(doc(db, "alunos", id), { status: 'aprovado' }); carregarAlunos(); } };
window.removerAluno = async (id) => { if(confirm("Apagar?")) { await deleteDoc(doc(db, "alunos", id)); carregarAlunos(); } };
window.resetarSenha = async (email) => { if(confirm(`Reset para ${email}?`)) { await sendPasswordResetEmail(auth, email); alert("Enviado!"); } };
if(document.getElementById('btn-sair')) document.getElementById('btn-sair').addEventListener('click', async () => { await signOut(auth); window.location.href = "index.html"; });