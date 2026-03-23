import { onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, updateDoc, deleteDoc, setDoc, addDoc, onSnapshot, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const EMAIL_ADMIN = "gustavo.ponce.ifpr@gmail.com"; 
let usuarioAtualNome = "Aluno"; 
let usuarioAtualFoto = "assets/img/default-avatar.png";
let isAdmin = false;
let meuEmoji = "";

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
      const dados = docSnap.data();
      usuarioAtualNome = user.displayName || dados.nome;
      meuEmoji = dados.emoji || "";
      
      usuarioAtualFoto = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(usuarioAtualNome)}&background=1351b4&color=fff&size=128&bold=true`;
      
      const elNome = document.getElementById('user-name');
      const elFoto = document.getElementById('user-photo');
      if(elNome) elNome.innerText = meuEmoji ? `${usuarioAtualNome} ${meuEmoji}` : usuarioAtualNome;
      if(elFoto) elFoto.src = usuarioAtualFoto;

      if (user.email === EMAIL_ADMIN) {
        isAdmin = true;
        const menuAdmin = document.getElementById('menu-admin');
        const userRole = document.getElementById('user-role');
        if(menuAdmin) menuAdmin.classList.remove('hidden');
        if(userRole) { userRole.innerText = "Presidente / Admin"; userRole.classList.replace('text-[var(--color-primary)]', 'text-red-400'); }
      }
      
      injetarPilotoAutomatico(); escutarPainelDados(); escutarForum(); carregarHub(); renderizarCalendario(); 
    } else { window.location.href = "index.html"; }
  } else { window.location.href = "index.html"; }
});

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('mobile-overlay');
const btnAbrir = document.getElementById('btn-abrir-menu');
const btnFechar = document.getElementById('btn-fechar-menu');

function toggleMenu() { if (sidebar && overlay) { sidebar.classList.toggle('-translate-x-full'); overlay.classList.toggle('hidden'); } }
if (btnAbrir) btnAbrir.addEventListener('click', toggleMenu);
if (btnFechar) btnFechar.addEventListener('click', toggleMenu);
if (overlay) overlay.addEventListener('click', toggleMenu);

// ==========================================
// 3. ROTEAMENTO SPA (Telas) E PERFIL
// ==========================================
const views = ['dashboard', 'hub', 'calendario', 'forum', 'admin', 'perfil'];
const navs = {
  'dashboard': { btn: 'nav-dashboard', titulo: 'Visão Geral' },
  'hub': { btn: 'nav-hub', titulo: 'Hub de Editais' },
  'calendario': { btn: 'nav-calendario', titulo: 'Agenda Letiva' },
  'forum': { btn: 'nav-forum', titulo: 'Fórum da Turma' },
  'admin': { btn: 'nav-admin', titulo: '<span class="text-red-500"><i class="fa-solid fa-crown mr-2"></i> Liderança</span>' },
  'perfil': { btn: null, titulo: '<i class="fa-solid fa-id-badge mr-2 text-[var(--color-blue)]"></i> Meu Perfil' }
};

function trocarTela(telaAtiva) {
  views.forEach(view => {
    let el = document.getElementById(`view-${view}`);
    if(!el) return;
    if(view === telaAtiva) { el.classList.remove('hidden'); el.classList.add(view==='forum'||view==='calendario'||view==='hub'||view==='perfil' ? 'flex' : 'block'); }
    else { el.classList.add('hidden'); el.classList.remove('flex', 'block'); }
    
    const btn = document.getElementById(navs[view].btn);
    if(btn && view !== 'perfil') {
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

const btnPerfil = document.getElementById('user-photo');
if(btnPerfil) btnPerfil.addEventListener('click', () => { trocarTela('perfil'); carregarMeuPerfil(); });

function formatarLinks(texto) { return texto.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-[var(--color-blue)] hover:underline font-bold">Link</a>'); }

// ==========================================
// 4. MEU PERFIL (Profiler)
// ==========================================
async function carregarMeuPerfil() {
  document.getElementById('perfil-foto-preview').src = usuarioAtualFoto;
  document.getElementById('perfil-nome-display').innerText = usuarioAtualNome;
  try {
    const docSnap = await getDoc(doc(db, "alunos", auth.currentUser.uid));
    if(docSnap.exists()) {
      const dados = docSnap.data();
      document.getElementById('perfil-emoji').value = dados.emoji || "";
      document.getElementById('perfil-whatsapp').value = dados.whatsapp || "";
      document.getElementById('perfil-instagram').value = dados.instagram || "";
    }
  } catch(e) {}
}

window.salvarMeuPerfil = async () => {
  const emoji = document.getElementById('perfil-emoji').value;
  const wpp = document.getElementById('perfil-whatsapp').value.trim();
  const insta = document.getElementById('perfil-instagram').value.trim();
  const btn = document.getElementById('btn-salvar-perfil');
  
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Salvando...`;
  try {
    await updateDoc(doc(db, "alunos", auth.currentUser.uid), { emoji: emoji, whatsapp: wpp, instagram: insta });
    meuEmoji = emoji;
    document.getElementById('user-name').innerText = meuEmoji ? `${usuarioAtualNome} ${meuEmoji}` : usuarioAtualNome;
    alert("✅ Perfil salvo! Agora seu emoji vai aparecer no Fórum.");
  } catch(e) { alert("Erro ao salvar."); }
  btn.innerHTML = `<i class="fa-solid fa-floppy-disk mr-2"></i> Salvar Alterações`;
};

// ==========================================
// 5. PILOTO AUTOMÁTICO & RADAR
// ==========================================
function injetarPilotoAutomatico() {
  const diaSemana = new Date().getDay();
  const ulGrade = document.getElementById('dash-lista-aulas');
  const dashDia = document.getElementById('dash-dia');
  
  if (diaSemana >= 1 && diaSemana <= 5) {
    const hoje = GRADE_DE_AULAS_FIXA[diaSemana];
    if(dashDia) dashDia.innerText = hoje.dia;
    if(ulGrade) ulGrade.innerHTML = `<li class="flex justify-between items-center border-b border-[var(--border-dark)] pb-2"><span class="text-[var(--text-muted)]">19:00 - 20:30</span><span class="font-bold text-white">${hoje.a1}</span></li><li class="flex justify-between items-center border-b border-[var(--border-dark)] pb-2 pt-1"><span class="text-[var(--text-muted)]">20:45 - 22:30</span><span class="font-bold text-white">${hoje.a2}</span></li>`;
  } else {
    if(dashDia) dashDia.innerText = "Fim de Semana";
    if(ulGrade) ulGrade.innerHTML = `<li class="text-center text-[var(--text-muted)] text-xs py-2 italic">Nenhuma aula programada hoje. Descanse!</li>`;
  }
}

function processarRadarTarefas(eventosBanco) {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  let tHoje = null; let eFuturo = null; let dias = 999;
  for (const [dataId, txt] of Object.entries(eventosBanco)) {
    const p = dataId.split('-'); const dEvento = new Date(p[0], p[1], p[2]);
    const diff = Math.ceil((dEvento.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
    if (diff === 0) tHoje = txt;
    else if (diff > 0 && diff <= 7) { if (diff < dias) { dias = diff; eFuturo = { t: txt, d: diff, dF: `${p[2]}/${parseInt(p[1])+1}` }; } }
  }
  const dT = document.getElementById('dash-tarefa'); const dR = document.getElementById('radar-container'); const dRT = document.getElementById('radar-texto');
  if(dT) { if (tHoje) dT.innerHTML = `<span class="text-yellow-400"><i class="fa-solid fa-thumbtack mr-1"></i> ${tHoje}</span>`; else dT.innerHTML = `<span class="text-[var(--text-muted)] font-normal">Nenhuma atividade hoje.</span>`; }
  if(dR && dRT) { if (eFuturo) { dR.classList.remove('hidden'); dR.classList.add('flex'); dRT.innerText = `${eFuturo.t} (${eFuturo.d === 1 ? 'AMANHÃ' : `em ${eFuturo.d} dias`} - ${eFuturo.dF})`; } else { dR.classList.add('hidden'); dR.classList.remove('flex'); } }
}

// ==========================================
// 6. CALENDÁRIO & HUB
// ==========================================
let mesAtual = new Date().getMonth(); let anoAtual = new Date().getFullYear(); 
const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function renderizarCalendario() {
  const grid = document.getElementById('calendario-grade');
  if(document.getElementById('mes-atual-titulo')) document.getElementById('mes-atual-titulo').innerText = `${mesesNomes[mesAtual]} ${anoAtual}`;
  const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay(); const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate(); const hoje = new Date();
  
  onSnapshot(collection(db, "calendario"), (snapshot) => {
    let eventosMes = {}; snapshot.forEach(doc => { eventosMes[doc.id] = doc.data().texto; });
    processarRadarTarefas(eventosMes);
    if(grid) {
        grid.innerHTML = ''; for (let i = 0; i < primeiroDia; i++) grid.innerHTML += `<div></div>`; 
        for (let dia = 1; dia <= diasNoMes; dia++) {
          let id = `${anoAtual}-${mesAtual}-${dia}`; let tem = eventosMes[id]; let ehHoje = (dia === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear());
          let cf = ehHoje ? 'bg-[var(--color-blue)] border-[var(--color-blue)]' : 'bg-[#2a2a2e] border-[var(--border-dark)] hover:border-[var(--color-blue)]';
          let tag = tem ? `<div class="mt-1 text-[8px] sm:text-[10px] leading-tight font-bold bg-yellow-500 text-black px-1 rounded line-clamp-2">${tem}</div>` : '';
          let cli = isAdmin ? `onclick="addEventoCalendario('${id}', '${dia}/${mesAtual+1}', '${tem || ''}')"` : '';
          let cur = isAdmin ? 'cursor-pointer hover:-translate-y-1 transition-transform' : '';
          grid.innerHTML += `<div ${cli} class="border rounded p-1 flex flex-col ${cf} ${cur}"><span class="font-bold text-[10px] sm:text-xs text-right ${ehHoje ? 'text-white' : 'text-gray-300'}">${dia}</span>${tag}</div>`;
        }
    }
  });
}
window.addEventoCalendario = async (docId, dFmt, eAtu) => { const nEv = prompt(`Lançar atividade para ${dFmt}:\n(Vazio apaga)`, eAtu); if (nEv !== null) { if (nEv.trim() === "") await deleteDoc(doc(db, "calendario", docId)); else await setDoc(doc(db, "calendario", docId), { texto: nEv.substring(0, 40) }); } };
if(document.getElementById('btn-mes-ant')) document.getElementById('btn-mes-ant').addEventListener('click', () => { mesAtual--; if(mesAtual < 0) { mesAtual = 11; anoAtual--; } renderizarCalendario(); });
if(document.getElementById('btn-mes-prox')) document.getElementById('btn-mes-prox').addEventListener('click', () => { mesAtual++; if(mesAtual > 11) { mesAtual = 0; anoAtual++; } renderizarCalendario(); });

function carregarHub() {
  onSnapshot(query(collection(db, "hub_editais"), orderBy("timestamp", "desc")), (snapshot) => {
    const lista = document.getElementById('lista-hub'); if(lista) lista.innerHTML = '';
    const bTag = document.getElementById('banner-tag'); const bTit = document.getElementById('banner-titulo'); const bTex = document.getElementById('banner-texto'); const bBtn = document.getElementById('banner-btn-link');
    if(snapshot.empty) { 
      if(lista) lista.innerHTML = '<div class="text-[var(--text-muted)] text-sm">Nenhum edital.</div>'; 
      if(bTag) bTag.innerHTML = '<i class="fa-solid fa-rocket mr-1"></i> PLATAFORMA CORE'; if(bTit) bTit.innerText = "Bem-vindo."; if(bBtn) bBtn.classList.add('hidden'); return; 
    }
    const uPost = snapshot.docs[0].data();
    if(bTag) { bTag.innerHTML = `<i class="fa-solid fa-thumbtack mr-1"></i> ${uPost.categoria.toUpperCase()}`; bTit.innerText = uPost.titulo; bTex.innerText = uPost.texto; if(uPost.link) { bBtn.href = uPost.link; bBtn.classList.remove('hidden'); bBtn.classList.add('inline-flex'); } else { bBtn.classList.add('hidden'); } }
    if(lista) {
        snapshot.forEach((doc) => {
          const p = doc.data(); const dStr = p.timestamp ? new Date(p.timestamp.toDate()).toLocaleDateString('pt-BR') : 'Agora';
          let cTag = p.categoria==='Bolsa/Auxílio'?'text-green-400 bg-green-500/10':p.categoria==='Evento'?'text-purple-400 bg-purple-500/10':p.categoria==='Estágio/Emprego'?'text-blue-400 bg-blue-500/10':'text-yellow-400 bg-yellow-500/10';
          let btn = p.link ? `<a href="${p.link}" target="_blank" class="mt-3 inline-flex items-center gap-2 bg-[var(--color-blue)] hover:bg-[#0f4396] text-white px-4 py-2 rounded text-xs font-bold"><i class="fa-solid fa-link"></i> Edital</a>` : '';
          lista.innerHTML += `<article class="bg-[var(--bg-card)] border border-[var(--border-dark)] rounded-xl p-4 shadow-sm"><div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2"><h2 class="text-base sm:text-lg font-bold text-white">${p.titulo}</h2><span class="text-[10px] font-bold px-2 py-1 rounded-full self-start sm:self-center shrink-0 ${cTag}">${p.categoria}</span></div><p class="text-[var(--text-muted)] text-xs sm:text-sm whitespace-pre-wrap mb-4">${p.texto}</p>${btn}</article>`;
        });
    }
  });
}
window.postarHub = async () => { const t = document.getElementById('hub-titulo').value.trim(); const c = document.getElementById('hub-categoria').value; const txt = document.getElementById('hub-texto').value.trim(); const l = document.getElementById('hub-link').value.trim(); if(!t || !txt) { alert("Preencha tudo."); return; } try { await addDoc(collection(db, "hub_editais"), { titulo: t, categoria: c, texto: txt, link: l, timestamp: serverTimestamp() }); document.getElementById('hub-titulo').value=''; document.getElementById('hub-texto').value=''; document.getElementById('hub-link').value=''; alert("✅ Lançado!"); } catch(e) {} };

// ==========================================
// 7. FÓRUM (ESTILO DISCORD COM HOVER E HORAS)
// ==========================================
function formatarDataHora(timestamp) {
  if (!timestamp) return "Enviando...";
  const data = timestamp.toDate();
  const hoje = new Date();
  const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
  
  const horas = data.getHours().toString().padStart(2, '0');
  const mins = data.getMinutes().toString().padStart(2, '0');
  const horaFmt = `${horas}:${mins}`;

  if (data.toDateString() === hoje.toDateString()) return `Hoje às ${horaFmt}`;
  if (data.toDateString() === ontem.toDateString()) return `Ontem às ${horaFmt}`;
  return `${data.toLocaleDateString('pt-BR')} às ${horaFmt}`;
}

function escutarForum() {
  onSnapshot(query(collection(db, "forum_mensagens"), orderBy("timestamp", "asc")), (snapshot) => {
    const chatBox = document.getElementById('chat-box'); 
    if(!chatBox) return; 
    chatBox.innerHTML = '';
    
    if(snapshot.empty) { 
      chatBox.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-60"><i class="fa-solid fa-ghost text-4xl mb-3"></i><p class="text-sm font-bold">O chat está vazio.</p><p class="text-xs">Mande o primeiro salve da turma!</p></div>`; 
      return; 
    }
    
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data(); const id = docSnap.id;
      const isMe = msg.uid === auth.currentUser.uid; 
      const isRep = msg.role === 'Representante';
      const timeStr = formatarDataHora(msg.timestamp);
      
      if (msg.apagada) {
        if (!isAdmin) {
          chatBox.innerHTML += `<div class="px-4 py-2 flex items-center gap-3 opacity-50"><div class="w-10 flex justify-center"><i class="fa-solid fa-ban text-xs text-gray-500"></i></div><p class="text-xs italic text-gray-500">Mensagem apagada pelo usuário.</p></div>`;
        } else {
          chatBox.innerHTML += `<div class="group px-4 py-3 flex gap-4 hover:bg-red-500/5 border-l-2 border-transparent hover:border-red-500/50 transition-colors relative"><img src="${msg.foto}" class="w-10 h-10 rounded-full object-cover shrink-0 grayscale opacity-50"><div class="flex-1 min-w-0"><div class="flex items-baseline gap-2 mb-0.5"><span class="font-bold text-sm text-red-400">${msg.autor}</span><span class="bg-red-500/20 text-red-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase"><i class="fa-solid fa-ghost mr-1"></i> Apagada</span><span class="text-[10px] text-[var(--text-muted)] ml-1">${timeStr}</span></div><p class="text-sm text-white/50 line-through">${formatarLinks(msg.texto)}</p></div><button onclick="hardDeleteMsg('${id}')" class="absolute right-4 top-4 bg-[var(--bg-card)] border border-red-500/30 text-red-500 hover:bg-red-600 hover:text-white w-7 h-7 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md"><i class="fa-solid fa-xmark text-sm"></i></button></div>`;
        }
        return;
      }

      let tagRep = isRep ? `<span class="bg-yellow-500 text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase shadow-sm transform -translate-y-[1px]"><i class="fa-solid fa-crown mr-1"></i> Liderança</span>` : '';
      let nomeColor = isRep ? 'text-yellow-500' : 'text-white';
      let btnDelete = (isMe || isAdmin) ? `<button onclick="softDeleteMsg('${id}')" class="absolute right-4 top-4 bg-[var(--bg-card)] border border-[var(--border-dark)] text-[var(--text-muted)] hover:text-red-400 hover:border-red-400/30 w-7 h-7 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"><i class="fa-solid fa-trash-can text-xs"></i></button>` : '';

      chatBox.innerHTML += `<div class="group px-4 py-3 flex gap-3 sm:gap-4 hover:bg-white/[0.02] border-l-2 border-transparent hover:border-[var(--color-blue)]/50 transition-colors relative"><img src="${msg.foto}" class="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-[var(--border-dark)] object-cover shrink-0 mt-0.5"><div class="flex-1 min-w-0"><div class="flex items-center gap-2 mb-1 flex-wrap"><span class="font-bold text-sm sm:text-base ${nomeColor}">${msg.autor}</span>${tagRep}<span class="text-[10px] sm:text-xs text-[var(--text-muted)] ml-1">${timeStr}</span></div><p class="text-sm sm:text-base text-[var(--text-main)] leading-relaxed break-words pr-8">${formatarLinks(msg.texto)}</p></div>${btnDelete}</div>`;
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

window.enviarMensagem = async () => {
  const input = document.getElementById('chat-input'); const texto = input.value.trim(); if(!texto) return;
  try { 
    input.value = ''; 
    const nomeComEmoji = meuEmoji ? `${usuarioAtualNome} ${meuEmoji}` : usuarioAtualNome;
    await addDoc(collection(db, "forum_mensagens"), { texto: texto, autor: nomeComEmoji, uid: auth.currentUser.uid, foto: usuarioAtualFoto, role: isAdmin ? 'Representante' : 'Aluno', apagada: false, timestamp: serverTimestamp() }); 
  } catch(e) {}
};
const btnEnviar = document.getElementById('btn-enviar-msg'); const inputChat = document.getElementById('chat-input');
if(btnEnviar) btnEnviar.addEventListener('click', window.enviarMensagem);
if(inputChat) inputChat.addEventListener('keypress', (e) => { if(e.key === 'Enter') { e.preventDefault(); window.enviarMensagem(); } });

window.softDeleteMsg = async (id) => { if(confirm("Deseja apagar esta mensagem? Ela sumirá para a turma.")) await updateDoc(doc(db, "forum_mensagens", id), { apagada: true }); };
window.hardDeleteMsg = async (id) => { if(confirm("Atenção Liderança: Deseja EXCLUIR DEFINITIVAMENTE esta mensagem do banco de dados?")) await deleteDoc(doc(db, "forum_mensagens", id)); };

// ==========================================
// 8. ADMIN: AVISOS E ALUNOS
// ==========================================
function escutarPainelDados() {
  onSnapshot(doc(db, "painel_dados", "geral"), (documento) => {
    if (documento.exists()) {
      const d = documento.data();
      if(document.getElementById('dash-aviso-titulo')) document.getElementById('dash-aviso-titulo').innerText = d.aviso_titulo || 'Aviso'; 
      if(document.getElementById('dash-aviso-texto')) document.getElementById('dash-aviso-texto').innerHTML = formatarLinks(d.aviso_texto || '...');
      const v = parseFloat(d.cafe_valor)||0; const m = parseFloat(d.cafe_meta)||1; let p=(v/m)*100; if(p>100)p=100;
      if(document.getElementById('dash-cafe-valor')) document.getElementById('dash-cafe-valor').innerText = `R$ ${v}`; if(document.getElementById('dash-cafe-meta')) document.getElementById('dash-cafe-meta').innerText = `Meta: R$ ${m}`; if(document.getElementById('dash-cafe-barra')) document.getElementById('dash-cafe-barra').style.width = `${p}%`;
      if(document.getElementById('edit-aviso-titulo')) document.getElementById('edit-aviso-titulo').value = d.aviso_titulo || ''; if(document.getElementById('edit-aviso-texto')) document.getElementById('edit-aviso-texto').value = d.aviso_texto || '';
      if(document.getElementById('edit-cafe-valor')) document.getElementById('edit-cafe-valor').value = d.cafe_valor || ''; if(document.getElementById('edit-cafe-meta')) document.getElementById('edit-cafe-meta').value = d.cafe_meta || '';
    }
  });
}
window.salvarPainel = async () => { try { await setDoc(doc(db, "painel_dados", "geral"), { aviso_titulo: document.getElementById('edit-aviso-titulo').value, aviso_texto: document.getElementById('edit-aviso-texto').value, cafe_valor: document.getElementById('edit-cafe-valor').value, cafe_meta: document.getElementById('edit-cafe-meta').value }, { merge: true }); alert("✅ Fundo e Avisos atualizados!"); } catch (e) {} };

async function carregarAlunos() {
  const lista = document.getElementById('lista-pendentes'); if(!lista) return;
  try {
    const qs = await getDocs(collection(db, "alunos")); lista.innerHTML = ''; 
    qs.forEach((d) => {
      const a = d.data(); const id = d.id; const tr = document.createElement('tr'); tr.className = "border-t border-[var(--border-dark)] hover:bg-[#2a2a2e]/50";
      let bStatus = a.status === 'aprovado' ? `<span class="bg-green-500/20 text-green-400 px-2 py-1 rounded text-[10px] font-bold">Aprovado</span>` : `<span class="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-[10px] font-bold animate-pulse">Pendente</span>`;
      let btn = a.status === 'pendente' ? `<button onclick="aprovarAluno('${id}')" class="bg-[var(--color-primary)] text-white w-7 h-7 rounded"><i class="fa-solid fa-check"></i></button><button onclick="removerAluno('${id}')" class="bg-red-500 text-white w-7 h-7 rounded"><i class="fa-solid fa-xmark"></i></button>` : `<button onclick="resetarSenha('${a.email}')" class="bg-purple-500 text-white w-7 h-7 rounded"><i class="fa-solid fa-key text-xs"></i></button><button onclick="removerAluno('${id}')" class="bg-red-500/20 text-red-400 w-7 h-7 rounded"><i class="fa-solid fa-trash text-xs"></i></button>`;
      tr.innerHTML = `<td class="p-3 sm:p-4"><div class="font-bold text-white leading-tight">${a.nome}</div><div class="text-[10px] sm:text-xs text-[var(--text-muted)] mt-0.5">${a.email}</div></td><td class="p-3 sm:p-4 text-center">${bStatus}</td><td class="p-3 sm:p-4 text-center flex justify-center gap-1.5">${btn}</td>`;
      lista.appendChild(tr);
    });
  } catch (e) {}
}
window.aprovarAluno = async (id) => { if(confirm("Liberar?")) { await updateDoc(doc(db, "alunos", id), { status: 'aprovado' }); carregarAlunos(); } };
window.removerAluno = async (id) => { if(confirm("Apagar?")) { await deleteDoc(doc(db, "alunos", id)); carregarAlunos(); } };
window.resetarSenha = async (email) => { if(confirm(`Reset para ${email}?`)) { await sendPasswordResetEmail(auth, email); alert("Enviado!"); } };
if(document.getElementById('btn-sair')) document.getElementById('btn-sair').addEventListener('click', async () => { await signOut(auth); window.location.href = "index.html"; });