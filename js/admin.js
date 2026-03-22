import { onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// O SEU E-MAIL CADASTRADO COMO LÍDER
const EMAIL_ADMIN = "gustavo.ponce.ifpr@gmail.com"; 

// 1. O SISTEMA DE PORTA (Mostra a tela certa)
onAuthStateChanged(auth, async (user) => {
  const telaBloqueio = document.getElementById('tela-bloqueio');
  const telaAdmin = document.getElementById('tela-admin');
  const msgBloqueio = document.getElementById('msg-bloqueio');

  if (user && user.email === EMAIL_ADMIN) {
    // É você! Esconde o cadeado e mostra o painel.
    telaBloqueio.classList.add('hidden');
    telaAdmin.classList.remove('hidden');
    carregarAlunos(); // Puxa os dados do banco
  } else {
    // Intruso detectado! Avisa na tela preta e expulsa depois de 2 segundos.
    msgBloqueio.innerText = "ACESSO NEGADO. Você não tem permissão.";
    msgBloqueio.classList.add('text-red-400');
    setTimeout(() => {
      window.location.href = "index.html"; // Chuta pro login
    }, 2000);
  }
});

// 2. FUNÇÃO QUE DESENHA A TABELA
async function carregarAlunos() {
  const lista = document.getElementById('lista-pendentes');
  lista.innerHTML = ''; 

  try {
    const querySnapshot = await getDocs(collection(db, "alunos"));

    if (querySnapshot.empty) {
      lista.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-[var(--text-muted)]">Nenhum aluno cadastrado ainda.</td></tr>`;
      return;
    }

    querySnapshot.forEach((documento) => {
      const aluno = documento.data();
      const id = documento.id;

      const tr = document.createElement('tr');
      tr.className = "border-t border-[var(--border-dark)] hover:bg-[#2a2a2e]/50 transition-colors";
      
      // Define a cor e texto do Status
      let badgeStatus = aluno.status === 'aprovado' 
        ? `<span class="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider shadow-sm border border-green-500/30">Aprovado</span>`
        : `<span class="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider shadow-sm border border-yellow-500/30 animate-pulse">Pendente</span>`;

      // Define os botões dependendo se já tá aprovado ou não
      let botoes = '';
      if (aluno.status === 'pendente') {
        botoes = `
          <button onclick="aprovarAluno('${id}')" title="Aprovar Acesso" class="bg-[var(--color-primary)] hover:bg-green-600 text-white w-8 h-8 rounded transition-colors shadow-md flex items-center justify-center"><i class="fa-solid fa-check"></i></button>
          <button onclick="removerAluno('${id}')" title="Recusar" class="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded transition-colors shadow-md flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button>
        `;
      } else {
        botoes = `
          <button onclick="editarNome('${id}', '${aluno.nome}')" title="Editar Nome" class="bg-[var(--color-blue)] hover:bg-[#0f4396] text-white w-8 h-8 rounded transition-colors shadow-md flex items-center justify-center"><i class="fa-solid fa-pen"></i></button>
          <button onclick="resetarSenha('${aluno.email}')" title="Redefinir Senha" class="bg-purple-500 hover:bg-purple-600 text-white w-8 h-8 rounded transition-colors shadow-md flex items-center justify-center"><i class="fa-solid fa-key"></i></button>
          <button onclick="removerAluno('${id}')" title="Revogar Acesso e Excluir" class="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white w-8 h-8 rounded transition-colors shadow-md flex items-center justify-center"><i class="fa-solid fa-trash"></i></button>
        `;
      }

      tr.innerHTML = `
        <td class="p-4 font-bold text-white">${aluno.nome}</td>
        <td class="p-4 text-[var(--text-muted)]">${aluno.email}</td>
        <td class="p-4 text-center">${badgeStatus}</td>
        <td class="p-4 text-center">
          <div class="flex justify-center gap-2">${botoes}</div>
        </td>
      `;
      lista.appendChild(tr);
    });

  } catch (error) {
    console.error("Erro ao buscar alunos:", error);
    lista.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-400 font-bold">Erro ao carregar os dados.</td></tr>`;
  }
}

// 3. AS FUNÇÕES DE COMANDO DO PRESIDENTE
window.aprovarAluno = async (id) => {
  if(confirm("Liberar acesso para este aluno?")) {
    await updateDoc(doc(db, "alunos", id), { status: 'aprovado' });
    carregarAlunos(); 
  }
};

window.removerAluno = async (id) => {
  if(confirm("ATENÇÃO: Deseja apagar este aluno do sistema? O acesso dele será revogado na hora.")) {
    await deleteDoc(doc(db, "alunos", id));
    carregarAlunos(); 
  }
};

window.editarNome = async (id, nomeAtual) => {
  const novoNome = prompt("Corrija o nome do aluno:", nomeAtual);
  if (novoNome && novoNome.trim() !== "" && novoNome !== nomeAtual) {
    await updateDoc(doc(db, "alunos", id), { nome: novoNome });
    carregarAlunos();
  }
};

window.resetarSenha = async (email) => {
  if(confirm(`Mandar um e-mail oficial de redefinição de senha para ${email}?`)) {
    try {
      await sendPasswordResetEmail(auth, email);
      alert("E-mail de redefinição enviado com sucesso para " + email);
    } catch (error) {
      console.error(error);
      alert("Erro ao tentar enviar o e-mail de reset. O usuário pode não ter senha (logado com o Google).");
    }
  }
};