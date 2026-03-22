import { onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const EMAIL_ADMIN = "gustavo.ponce.ifpr@gmail.com"; 

// ==========================================
// 1. SISTEMA DE SEGURANÇA E INICIALIZAÇÃO
// ==========================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "alunos", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().status === 'aprovado') {
      // Bota o nome do caboclo na tela
      const nomeElement = document.getElementById('user-name');
      if(nomeElement) nomeElement.innerText = user.displayName || docSnap.data().nome;

      // Se for o Presidente (Você), liga o modo Deus
      if (user.email === EMAIL_ADMIN) {
        document.getElementById('menu-admin').classList.remove('hidden');
        document.getElementById('user-role').innerText = "Presidente / Admin";
        document.getElementById('user-role').classList.replace('text-[var(--color-primary)]', 'text-red-400');
      }
    } else {
      window.location.href = "index.html"; // Chuta se não tiver aprovado
    }
  } else {
    window.location.href = "index.html"; // Chuta se não tiver logado
  }
});

// ==========================================
// 2. NAVEGAÇÃO ENTRE AS ABAS (Single Page)
// ==========================================
const navInicio = document.getElementById('nav-inicio');
const navAdmin = document.getElementById('nav-admin');
const viewDashboard = document.getElementById('view-dashboard');
const viewAdmin = document.getElementById('view-admin');
const tituloPagina = document.getElementById('titulo-pagina');

// Clicou no Início
navInicio.addEventListener('click', (e) => {
  e.preventDefault();
  viewDashboard.classList.remove('hidden');
  viewAdmin.classList.add('hidden');
  
  // Muda o botão que tá selecionado de cor
  navInicio.classList.add('bg-[var(--color-blue)]', 'text-white');
  navInicio.classList.remove('text-[var(--text-muted)]', 'hover:bg-[#2a2a2e]');
  
  navAdmin.classList.remove('bg-red-500/10', 'text-white');
  navAdmin.classList.add('text-red-400');
  
  tituloPagina.innerText = "Visão Geral";
});

// Clicou na Gestão da Turma
navAdmin.addEventListener('click', (e) => {
  e.preventDefault();
  viewDashboard.classList.add('hidden');
  viewAdmin.classList.remove('hidden');
  
  // Muda o botão que tá selecionado de cor
  navAdmin.classList.add('bg-red-500/10', 'text-white');
  navAdmin.classList.remove('text-red-400');
  
  navInicio.classList.remove('bg-[var(--color-blue)]', 'text-white');
  navInicio.classList.add('text-[var(--text-muted)]', 'hover:bg-[#2a2a2e]');
  
  tituloPagina.innerHTML = "<span class='text-red-500'><i class='fa-solid fa-crown mr-2'></i> Painel da Liderança</span>";
  
  // Carrega os alunos só na hora que abre a aba!
  carregarAlunos(); 
});


// ==========================================
// 3. O MOTOR DA TABELA DE ADMINISTRAÇÃO
// ==========================================
async function carregarAlunos() {
  const lista = document.getElementById('lista-pendentes');
  lista.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-[var(--text-muted)]"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Buscando alunos...</td></tr>`;

  try {
    const querySnapshot = await getDocs(collection(db, "alunos"));

    if (querySnapshot.empty) {
      lista.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-[var(--text-muted)]">Nenhum aluno cadastrado.</td></tr>`;
      return;
    }

    lista.innerHTML = ''; // Limpa antes de preencher

    querySnapshot.forEach((documento) => {
      const aluno = documento.data();
      const id = documento.id;
      const tr = document.createElement('tr');
      tr.className = "border-t border-[var(--border-dark)] hover:bg-[#2a2a2e]/50 transition-colors";
      
      let badgeStatus = aluno.status === 'aprovado' 
        ? `<span class="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border border-green-500/30">Aprovado</span>`
        : `<span class="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border border-yellow-500/30 animate-pulse">Pendente</span>`;

      let botoes = aluno.status === 'pendente' 
        ? `<button onclick="aprovarAluno('${id}')" title="Aprovar" class="bg-[var(--color-primary)] hover:bg-green-600 text-white w-8 h-8 rounded flex items-center justify-center transition"><i class="fa-solid fa-check"></i></button>
           <button onclick="removerAluno('${id}')" title="Recusar" class="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded flex items-center justify-center transition"><i class="fa-solid fa-xmark"></i></button>`
        : `<button onclick="editarNome('${id}', '${aluno.nome}')" title="Editar Nome" class="bg-[var(--color-blue)] hover:bg-[#0f4396] text-white w-8 h-8 rounded flex items-center justify-center transition"><i class="fa-solid fa-pen"></i></button>
           <button onclick="resetarSenha('${aluno.email}')" title="Resetar Senha" class="bg-purple-500 hover:bg-purple-600 text-white w-8 h-8 rounded flex items-center justify-center transition"><i class="fa-solid fa-key"></i></button>
           <button onclick="removerAluno('${id}')" title="Excluir" class="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white w-8 h-8 rounded flex items-center justify-center transition"><i class="fa-solid fa-trash"></i></button>`;

      tr.innerHTML = `
        <td class="p-4 font-bold text-white">${aluno.nome}</td>
        <td class="p-4 text-[var(--text-muted)]">${aluno.email}</td>
        <td class="p-4 text-center">${badgeStatus}</td>
        <td class="p-4 text-center"><div class="flex justify-center gap-2">${botoes}</div></td>
      `;
      lista.appendChild(tr);
    });
  } catch (error) {
    console.error(error);
    lista.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-400">Erro de conexão com o Banco de Dados.</td></tr>`;
  }
}

// Funções dos botões (Globais para o HTML rodar)
window.aprovarAluno = async (id) => {
  if(confirm("Liberar acesso?")) {
    await updateDoc(doc(db, "alunos", id), { status: 'aprovado' });
    carregarAlunos(); 
  }
};
window.removerAluno = async (id) => {
  if(confirm("Apagar aluno do sistema permanentemente?")) {
    await deleteDoc(doc(db, "alunos", id));
    carregarAlunos(); 
  }
};
window.editarNome = async (id, nomeAtual) => {
  const novoNome = prompt("Corrija o nome:", nomeAtual);
  if (novoNome && novoNome.trim() !== "" && novoNome !== nomeAtual) {
    await updateDoc(doc(db, "alunos", id), { nome: novoNome });
    carregarAlunos();
  }
};
window.resetarSenha = async (email) => {
  if(confirm(`Enviar e-mail oficial de redefinição para ${email}?`)) {
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Enviado com sucesso!");
    } catch (e) { alert("Erro ao enviar o e-mail."); }
  }
};

// Botão de Sair Global
document.getElementById('btn-sair').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = "index.html"; 
});