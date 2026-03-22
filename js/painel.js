import { onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, updateDoc, deleteDoc, setDoc, addDoc, onSnapshot, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const EMAIL_ADMIN = "gustavo.ponce.ifpr@gmail.com"; 
let usuarioAtualNome = "Aluno"; 

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
        document.getElementById('menu-admin').classList.remove('hidden');
        document.getElementById('user-role').innerText = "Presidente / Admin";
        document.getElementById('user-role').classList.replace('text-[var(--color-primary)]', 'text-red-400');
      }
      
      escutarPainelDados(); // Dashboard
      escutarForum();       // Chat
      carregarBlog();       // Puxa Histórico de Editais
      renderizarCalendario(); // Cria a grade visual do calendário

    } else { window.location.href = "index.html"; }
  } else { window.location.href = "index.html"; }
});

// ==========================================
// 2. ROTEAMENTO SPA (Telas)
// ==========================================
const views = ['dashboard', 'blog', 'calendario', 'forum', 'admin'];
const navs = {
  'dashboard': { btn: 'nav-inicio', titulo: 'Visão Geral' },
  'blog': { btn: 'nav-blog', titulo: '<i class="fa-solid fa-newspaper mr-2 text-[var(--color-blue)]"></i> Mural Oficial & Editais' },
  'calendario': { btn: 'nav-calendario', titulo: '<i class="fa-regular fa-calendar-days mr-2 text-[var(--color-blue)]"></i> Calendário Letivo' },
  'forum': { btn: 'nav-forum', titulo: '<i class="fa-solid fa-comments mr-2 text-[var(--color-blue)]"></i> Fórum da Turma' },
  'admin': { btn: 'nav-admin', titulo: '<span class="text-red-500"><i class="fa-solid fa-crown mr-2"></i> Liderança</span>' }
};

function trocarTela(telaAtiva) {
  views.forEach(view => {
    let el = document.getElementById(`view-${view}`);
    if(view === telaAtiva) { el.classList.remove('hidden'); el.classList.add(view==='forum'||view==='calendario'||view==='blog' ? 'flex' : 'block'); }
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
document.getElementById('nav-blog').addEventListener('click', (e) => { e.preventDefault(); trocarTela('blog'); });
document.getElementById('nav-calendario').addEventListener('click', (e) => { e.preventDefault(); trocarTela('calendario'); });
document.getElementById('nav-forum').addEventListener('click', (e) => { e.preventDefault(); trocarTela('forum'); });
document.getElementById('nav-admin').addEventListener('click', (e) => { e.preventDefault(); trocarTela('admin'); });

// ==========================================
// 3. O BLOG / EDITAIS (Postagens Oficiais)
// ==========================================
function carregarBlog() {
  const q = query(collection(db, "blog_posts"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snapshot) => {
    const lista = document.getElementById('lista-blog');
    lista.innerHTML = '';
    if(snapshot.empty) { lista.innerHTML = '<div class="text-[var(--text-muted)] text-sm">Nenhuma postagem oficial ainda.</div>'; return; }
    
    snapshot.forEach((doc) => {
      const post = doc.data();
      // Formata a data bonitinha
      const dataStr = post.timestamp ? new Date(post.timestamp.toDate()).toLocaleDateString('pt-BR', {day:'2-digit', month:'short', year:'numeric'}) : 'Agora';
      
      lista.innerHTML += `
        <article class="bg-[var(--bg-card)] border border-[var(--border-dark)] rounded-xl p-6 shadow-sm">
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-xl font-bold text-white">${post.titulo}</h2>
            <span class="text-xs font-bold text-[var(--color-primary)] bg-green-500/10 px-3 py-1 rounded-full"><i class="fa-solid fa-thumbtack mr-1"></i> Oficial</span>
          </div>
          <p class="text-[var(--text-muted)] text-sm whitespace-pre-wrap leading-relaxed mb-4">${post.texto}</p>
          <div class="text-xs text-gray-500 font-semibold border-t border-[var(--border-dark)] pt-3"><i class="fa-regular fa-calendar mr-1"></i> Publicado em ${dataStr} pela Liderança</div>
        </article>
      `;
    });
  });
}

window.postarBlog = async () => {
  const titulo = document.getElementById('blog-titulo').value.trim();
  const texto = document.getElementById('blog-texto').value.trim();
  if(!titulo || !texto) { alert("Preencha título e texto do Edital."); return; }

  try {
    await addDoc(collection(db, "blog_posts"), { titulo: titulo, texto: texto, timestamp: serverTimestamp() });
    document.getElementById('blog-titulo').value = ''; document.getElementById('blog-texto').value = '';
    alert("✅ Postagem Oficial publicada com sucesso! Todos já podem ver.");
  } catch(e) { console.error(e); alert("Erro ao postar."); }
};

// ==========================================
// 4. O CALENDÁRIO 2026 (Grade Base)
// ==========================================
let mesAtual = new Date().getMonth(); // 0 a 11
let anoAtual = new Date().getFullYear(); // Ex: 2026
const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function renderizarCalendario() {
  const grid = document.getElementById('calendario-grade');
  const titulo = document.getElementById('mes-atual-titulo');
  
  grid.innerHTML = '';
  titulo.innerText = `${mesesNomes[mesAtual]} ${anoAtual}`;

  // Descobre em qual dia da semana (0-Dom, 6-Sáb) o mês começa, e quantos dias o mês tem
  const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay();
  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();

  // Cria espaços vazios antes do dia 1
  for (let i = 0; i < primeiroDia; i++) {
    grid.innerHTML += `<div class="bg-[var(--bg-card)] border border-[var(--border-dark)] rounded p-2 opacity-30"></div>`;
  }

  // Cria os dias do mês
  const hoje = new Date();
  for (let dia = 1; dia <= diasNoMes; dia++) {
    // Marca em azul se for o dia de hoje
    let ehHoje = (dia === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear());
    let corBorda = ehHoje ? 'border-[var(--color-blue)] bg-[#0f4396]/20' : 'border-[var(--border-dark)] bg-[#2a2a2e] hover:border-[var(--text-muted)]';
    let corTexto = ehHoje ? 'text-white' : 'text-[var(--text-muted)]';

    grid.innerHTML += `
      <div class="border rounded p-2 text-right transition-colors relative h-16 sm:h-24 ${corBorda} cursor-pointer">
        <span class="font-bold text-sm ${corTexto}">${dia}</span>
        <div class="eventos-dia absolute bottom-2 left-2 right-2 flex flex-col gap-1"></div>
      </div>
    `;
  }
}

document.getElementById('btn-mes-ant').addEventListener('click', () => { mesAtual--; if(mesAtual < 0) { mesAtual = 11; anoAtual--; } renderizarCalendario(); });
document.getElementById('btn-mes-prox').addEventListener('click', () => { mesAtual++; if(mesAtual > 11) { mesAtual = 0; anoAtual++; } renderizarCalendario(); });

// ==========================================
// 5. CHAT AO VIVO
// ==========================================
function escutarForum() {
  const q = query(collection(db, "forum_mensagens"), orderBy("timestamp", "asc"));
  onSnapshot(q, (snapshot) => {
    const chatBox = document.getElementById('chat-box'); chatBox.innerHTML = '';
    if(snapshot.empty) { chatBox.innerHTML = '<div class="text-center text-[var(--text-muted)] mt-10">Dê o primeiro salve da turma!</div>'; return; }
    snapshot.forEach((doc) => {
      const msg = doc.data(); const isMe = msg.autor === usuarioAtualNome;
      chatBox.innerHTML += `<div class="mb-3"><div class="inline-block p-3 rounded-xl border ${isMe ? 'bg-[var(--color-blue)]/10 border-[var(--color-blue)]/30' : 'bg-[#2a2a2e] border-[var(--border-dark)]'} text-sm"><span class="font-bold text-xs block mb-1 ${isMe ? 'text-[var(--color-blue)]' : 'text-[var(--color-primary)]'}">${msg.autor}</span><span class="text-white">${msg.texto}</span></div></div>`;
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}
window.enviarMensagem = async () => {
  const input = document.getElementById('chat-input'); const texto = input.value.trim(); if(!texto) return;
  try { input.value = ''; await addDoc(collection(db, "forum_mensagens"), { texto: texto, autor: usuarioAtualNome, timestamp: serverTimestamp() }); } catch(e) {}
};

// ==========================================
// 6. DASHBOARD DIÁRIO
// ==========================================
function escutarPainelDados() {
  onSnapshot(doc(db, "painel_dados", "geral"), (documento) => {
    if (documento.exists()) {
      const dados = documento.data();
      document.getElementById('dash-dia').innerText = dados.horario_dia || 'Hoje';
      document.getElementById('dash-hora1').innerText = dados.hora1 || '--:--'; document.getElementById('dash-aula1').innerText = dados.aula1 || '...';
      document.getElementById('dash-hora2').innerText = dados.hora2 || '--:--'; document.getElementById('dash-aula2').innerText = dados.aula2 || '...';
      document.getElementById('dash-tarefa').innerText = dados.tarefas || 'Nenhuma atividade extra.';
      document.getElementById('dash-aviso-titulo').innerText = dados.aviso_titulo || 'Aviso'; document.getElementById('dash-aviso-texto').innerText = dados.aviso_texto || '...';
      const vCafe = parseFloat(dados.cafe_valor) || 0; const mCafe = parseFloat(dados.cafe_meta) || 1;
      let p = (vCafe / mCafe) * 100; if (p > 100) p = 100;
      document.getElementById('dash-cafe-valor').innerText = `R$ ${vCafe}`; document.getElementById('dash-cafe-meta').innerText = `Meta: R$ ${mCafe}`; document.getElementById('dash-cafe-barra').style.width = `${p}%`;
      
      document.getElementById('edit-dia').value = dados.horario_dia || '';
      document.getElementById('edit-hora1').value = dados.hora1 || ''; document.getElementById('edit-aula1').value = dados.aula1 || '';
      document.getElementById('edit-hora2').value = dados.hora2 || ''; document.getElementById('edit-aula2').value = dados.aula2 || '';
      document.getElementById('edit-tarefa').value = dados.tarefas || '';
      document.getElementById('edit-aviso-titulo').value = dados.aviso_titulo || ''; document.getElementById('edit-aviso-texto').value = dados.aviso_texto || '';
      document.getElementById('edit-cafe-valor').value = dados.cafe_valor || ''; document.getElementById('edit-cafe-meta').value = dados.cafe_meta || '';
    }
  });
}
window.salvarPainel = async () => {
  const dados = {
    horario_dia: document.getElementById('edit-dia').value,
    hora1: document.getElementById('edit-hora1').value, aula1: document.getElementById('edit-aula1').value,
    hora2: document.getElementById('edit-hora2').value, aula2: document.getElementById('edit-aula2').value,
    tarefas: document.getElementById('edit-tarefa').value,
    aviso_titulo: document.getElementById('edit-aviso-titulo').value, aviso_texto: document.getElementById('edit-aviso-texto').value,
    cafe_valor: document.getElementById('edit-cafe-valor').value, cafe_meta: document.getElementById('edit-cafe-meta').value,
  };
  try { await setDoc(doc(db, "painel_dados", "geral"), dados, { merge: true }); alert("🚀 Painel diário atualizado!"); } catch (e) { alert("Erro ao salvar."); }
};

// ==========================================
// 7. GESTÃO DE ALUNOS
// ==========================================
async function carregarAlunos() {
  const lista = document.getElementById('lista-pendentes');
  try {
    const qs = await getDocs(collection(db, "alunos")); lista.innerHTML = ''; 
    qs.forEach((d) => {
      const a = d.data(); const id = d.id;
      const tr = document.createElement('tr'); tr.className = "border-t border-[var(--border-dark)]";
      let bStatus = a.status === 'aprovado' ? `<span class="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">Aprovado</span>` : `<span class="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-bold">Pendente</span>`;
      let btn = a.status === 'pendente' 
        ? `<button onclick="aprovarAluno('${id}')" class="bg-[var(--color-primary)] text-white w-8 h-8 rounded"><i class="fa-solid fa-check"></i></button><button onclick="removerAluno('${id}')" class="bg-red-500 text-white w-8 h-8 rounded"><i class="fa-solid fa-xmark"></i></button>`
        : `<button onclick="editarNome('${id}', '${a.nome}')" class="bg-[var(--color-blue)] text-white w-8 h-8 rounded"><i class="fa-solid fa-pen"></i></button><button onclick="resetarSenha('${a.email}')" class="bg-purple-500 text-white w-8 h-8 rounded"><i class="fa-solid fa-key"></i></button><button onclick="removerAluno('${id}')" class="bg-red-500/20 text-red-400 w-8 h-8 rounded"><i class="fa-solid fa-trash"></i></button>`;
      tr.innerHTML = `<td class="p-4 font-bold text-white">${a.nome}</td><td class="p-4 text-center">${bStatus}</td><td class="p-4 text-center flex justify-center gap-2">${btn}</td>`;
      lista.appendChild(tr);
    });
  } catch (e) {}
}
window.aprovarAluno = async (id) => { if(confirm("Liberar?")) { await updateDoc(doc(db, "alunos", id), { status: 'aprovado' }); carregarAlunos(); } };
window.removerAluno = async (id) => { if(confirm("Apagar?")) { await deleteDoc(doc(db, "alunos", id)); carregarAlunos(); } };
window.editarNome = async (id, nAtual) => { const n = prompt("Nome:", nAtual); if (n && n !== nAtual) { await updateDoc(doc(db, "alunos", id), { nome: n }); carregarAlunos(); } };
window.resetarSenha = async (email) => { if(confirm(`Reset para ${email}?`)) { await sendPasswordResetEmail(auth, email); alert("Enviado!"); } };
document.getElementById('btn-sair').addEventListener('click', async () => { await signOut(auth); window.location.href = "index.html"; });