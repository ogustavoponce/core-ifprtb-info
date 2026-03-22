import { onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, updateDoc, deleteDoc, setDoc, onSnapshot, addDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const EMAIL_ADMIN = "gustavo.ponce.ifpr@gmail.com"; 
let usuarioAtualNome = "Aluno"; // Vai guardar seu nome para o Chat

// ==========================================
// 1. INICIALIZAÇÃO E SEGURANÇA
// ==========================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "alunos", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().status === 'aprovado') {
      usuarioAtualNome = user.displayName || docSnap.data().nome; // Salva pra usar no fórum
      document.getElementById('user-name').innerText = usuarioAtualNome;

      if (user.email === EMAIL_ADMIN) {
        document.getElementById('menu-admin').classList.remove('hidden');
        document.getElementById('user-role').innerText = "Presidente / Admin";
        document.getElementById('user-role').classList.replace('text-[var(--color-primary)]', 'text-red-400');
      }
      
      escutarPainelDados(); // Atualiza Dashboard
      escutarForum();       // Inicia o Chat ao vivo

    } else { window.location.href = "index.html"; }
  } else { window.location.href = "index.html"; }
});

// ==========================================
// 2. NAVEGAÇÃO SPA (Alternar Telas)
// ==========================================
const views = ['dashboard', 'forum', 'calendario', 'admin'];
const navs = {
  'dashboard': { btn: 'nav-inicio', titulo: 'Visão Geral' },
  'forum': { btn: 'nav-forum', titulo: '<i class="fa-solid fa-comments mr-2 text-[var(--color-blue)]"></i> Fórum da Turma' },
  'calendario': { btn: 'nav-calendario', titulo: '<i class="fa-regular fa-calendar-days mr-2 text-[var(--color-blue)]"></i> Calendário Letivo' },
  'admin': { btn: 'nav-admin', titulo: '<span class="text-red-500"><i class="fa-solid fa-crown mr-2"></i> Painel da Liderança</span>' }
};

function trocarTela(telaAtiva) {
  views.forEach(view => {
    // Esconde ou mostra as telas
    if(view === telaAtiva) { document.getElementById(`view-${view}`).classList.remove('hidden'); document.getElementById(`view-${view}`).classList.add('flex'); }
    else { document.getElementById(`view-${view}`).classList.add('hidden'); document.getElementById(`view-${view}`).classList.remove('flex'); }
    
    // Arruma as cores dos botões do menu
    const btnId = navs[view].btn;
    const btn = document.getElementById(btnId);
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
document.getElementById('nav-forum').addEventListener('click', (e) => { e.preventDefault(); trocarTela('forum'); });
document.getElementById('nav-calendario').addEventListener('click', (e) => { e.preventDefault(); trocarTela('calendario'); });
document.getElementById('nav-admin').addEventListener('click', (e) => { e.preventDefault(); trocarTela('admin'); });

// ==========================================
// 3. O FÓRUM (CHAT AO VIVO)
// ==========================================
function escutarForum() {
  const q = query(collection(db, "forum_mensagens"), orderBy("timestamp", "asc"));
  onSnapshot(q, (snapshot) => {
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = '';
    
    if(snapshot.empty) {
      chatBox.innerHTML = '<div class="text-center text-[var(--text-muted)] mt-10 text-sm">Nenhuma mensagem ainda. Seja o primeiro a dar um salve!</div>';
      return;
    }

    snapshot.forEach((doc) => {
      const msg = doc.data();
      // O bloco de mensagem (se for você, fica azulzinho de leve)
      const isMe = msg.autor === usuarioAtualNome;
      const bg = isMe ? 'bg-[var(--color-blue)]/10 border-[var(--color-blue)]/30' : 'bg-[#2a2a2e] border-[var(--border-dark)]';
      
      chatBox.innerHTML += `
        <div class="mb-3">
          <div class="inline-block p-3 rounded-xl border ${bg} text-sm">
            <span class="font-bold text-xs block mb-1 ${isMe ? 'text-[var(--color-blue)]' : 'text-[var(--color-primary)]'}">${msg.autor}</span>
            <span class="text-white">${msg.texto}</span>
          </div>
        </div>
      `;
    });
    // Rola para o final da conversa automaticamente
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

window.enviarMensagem = async () => {
  const input = document.getElementById('chat-input');
  const texto = input.value.trim();
  if(!texto) return;

  try {
    input.value = ''; // Limpa na hora para ficar rápido
    await addDoc(collection(db, "forum_mensagens"), {
      texto: texto,
      autor: usuarioAtualNome,
      timestamp: serverTimestamp() // Pega a hora exata do servidor do Google
    });
  } catch(e) { console.error("Erro ao enviar mensagem", e); }
};

// ==========================================
// 4. MOTOR DO DASHBOARD (Aulas e Tarefas)
// ==========================================
function escutarPainelDados() {
  onSnapshot(doc(db, "painel_dados", "geral"), (documento) => {
    if (documento.exists()) {
      const dados = documento.data();
      document.getElementById('dash-dia').innerText = dados.horario_dia || 'Hoje';
      document.getElementById('dash-hora1').innerText = dados.hora1 || '--:--';
      document.getElementById('dash-aula1').innerText = dados.aula1 || '...';
      document.getElementById('dash-hora2').innerText = dados.hora2 || '--:--';
      document.getElementById('dash-aula2').innerText = dados.aula2 || '...';
      document.getElementById('dash-tarefa').innerText = dados.tarefas || 'Nenhuma atividade extra lançada.'; // NOVO
      
      document.getElementById('dash-aviso-titulo').innerText = dados.aviso_titulo || 'Mural';
      document.getElementById('dash-aviso-texto').innerText = dados.aviso_texto || '...';
      
      const vCafe = parseFloat(dados.cafe_valor) || 0; const mCafe = parseFloat(dados.cafe_meta) || 1;
      let porcentagem = (vCafe / mCafe) * 100; if (porcentagem > 100) porcentagem = 100;
      document.getElementById('dash-cafe-valor').innerText = `R$ ${vCafe}`; document.getElementById('dash-cafe-meta').innerText = `Meta: R$ ${mCafe}`; document.getElementById('dash-cafe-barra').style.width = `${porcentagem}%`;

      document.getElementById('edit-dia').value = dados.horario_dia || '';
      document.getElementById('edit-hora1').value = dados.hora1 || ''; document.getElementById('edit-aula1').value = dados.aula1 || '';
      document.getElementById('edit-hora2').value = dados.hora2 || ''; document.getElementById('edit-aula2').value = dados.aula2 || '';
      document.getElementById('edit-tarefa').value = dados.tarefas || ''; // NOVO
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
    tarefas: document.getElementById('edit-tarefa').value, // NOVO
    aviso_titulo: document.getElementById('edit-aviso-titulo').value, aviso_texto: document.getElementById('edit-aviso-texto').value,
    cafe_valor: document.getElementById('edit-cafe-valor').value, cafe_meta: document.getElementById('edit-cafe-meta').value,
  };
  try { await setDoc(doc(db, "painel_dados", "geral"), dados, { merge: true }); alert("🚀 Painel atualizado para todos em tempo real!"); } 
  catch (error) { console.error(error); alert("Erro ao salvar. Verifique as regras do Firestore."); }
};

// ==========================================
// 5. GESTÃO DE ALUNOS
// ==========================================
async function carregarAlunos() {
  const lista = document.getElementById('lista-pendentes');
  try {
    const querySnapshot = await getDocs(collection(db, "alunos"));
    lista.innerHTML = ''; 
    querySnapshot.forEach((documento) => {
      const aluno = documento.data(); const id = documento.id;
      const tr = document.createElement('tr'); tr.className = "border-t border-[var(--border-dark)]";
      let badgeStatus = aluno.status === 'aprovado' ? `<span class="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">Aprovado</span>` : `<span class="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-bold">Pendente</span>`;
      let botoes = aluno.status === 'pendente' 
        ? `<button onclick="aprovarAluno('${id}')" class="bg-[var(--color-primary)] text-white w-8 h-8 rounded"><i class="fa-solid fa-check"></i></button><button onclick="removerAluno('${id}')" class="bg-red-500 text-white w-8 h-8 rounded"><i class="fa-solid fa-xmark"></i></button>`
        : `<button onclick="editarNome('${id}', '${aluno.nome}')" class="bg-[var(--color-blue)] text-white w-8 h-8 rounded"><i class="fa-solid fa-pen"></i></button><button onclick="resetarSenha('${aluno.email}')" class="bg-purple-500 text-white w-8 h-8 rounded"><i class="fa-solid fa-key"></i></button><button onclick="removerAluno('${id}')" class="bg-red-500/20 text-red-400 w-8 h-8 rounded"><i class="fa-solid fa-trash"></i></button>`;
      tr.innerHTML = `<td class="p-4 font-bold text-white">${aluno.nome}</td><td class="p-4 text-center">${badgeStatus}</td><td class="p-4 text-center flex justify-center gap-2">${botoes}</td>`;
      lista.appendChild(tr);
    });
  } catch (error) { console.error(error); }
}

window.aprovarAluno = async (id) => { if(confirm("Liberar acesso?")) { await updateDoc(doc(db, "alunos", id), { status: 'aprovado' }); carregarAlunos(); } };
window.removerAluno = async (id) => { if(confirm("Apagar aluno?")) { await deleteDoc(doc(db, "alunos", id)); carregarAlunos(); } };
window.editarNome = async (id, nomeAtual) => { const n = prompt("Nome:", nomeAtual); if (n && n !== nomeAtual) { await updateDoc(doc(db, "alunos", id), { nome: n }); carregarAlunos(); } };
window.resetarSenha = async (email) => { if(confirm(`Reset para ${email}?`)) { await sendPasswordResetEmail(auth, email); alert("Enviado!"); } };
document.getElementById('btn-sair').addEventListener('click', async () => { await signOut(auth); window.location.href = "index.html"; });