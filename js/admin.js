import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// COLOQUE SEU E-MAIL AQUI TAMBÉM (O mesmo do Firebase Rules)
const EMAIL_ADMIN = "gustavo.ponce.ifpr@gmail.com"; 

onAuthStateChanged(auth, async (user) => {
  if (user && user.email === EMAIL_ADMIN) {
    // É o chefe! Carrega a lista.
    carregarPendentes();
  } else {
    // Intruso! Chuta pro painel normal.
    alert("Acesso Negado. Área restrita à liderança.");
    window.location.href = "painel.html";
  }
});

async function carregarPendentes() {
  const lista = document.getElementById('lista-pendentes');
  lista.innerHTML = ''; // Limpa o "Carregando..."

  try {
    // Busca no banco todo mundo que tá com status 'pendente'
    const q = query(collection(db, "alunos"), where("status", "==", "pendente"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      lista.innerHTML = `<tr><td colspan="3" class="p-8 text-center text-green-400 font-bold"><i class="fa-solid fa-check-circle mr-2"></i>Nenhuma solicitação pendente!</td></tr>`;
      return;
    }

    // Desenha cada aluno na tela
    querySnapshot.forEach((documento) => {
      const aluno = documento.data();
      const id = documento.id;

      const tr = document.createElement('tr');
      tr.className = "border-t border-[var(--border-dark)] hover:bg-[#2a2a2e]/50 transition-colors";
      
      tr.innerHTML = `
        <td class="p-4 font-bold text-white">${aluno.nome}</td>
        <td class="p-4 text-[var(--text-muted)]">${aluno.email}</td>
        <td class="p-4 text-center">
          <div class="flex justify-center gap-2">
            <button onclick="aprovarAluno('${id}')" class="bg-[var(--color-primary)] hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-md">
              <i class="fa-solid fa-check"></i> Aprovar
            </button>
            <button onclick="recusarAluno('${id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-md">
              <i class="fa-solid fa-xmark"></i> Recusar
            </button>
          </div>
        </td>
      `;
      lista.appendChild(tr);
    });

  } catch (error) {
    console.error("Erro ao buscar alunos:", error);
    lista.innerHTML = `<tr><td colspan="3" class="p-8 text-center text-red-400 font-bold">Erro ao carregar os dados. Verifique as regras do Firebase.</td></tr>`;
  }
}

// Funções globais para os botões do HTML conseguirem enxergar
window.aprovarAluno = async (id) => {
  if(confirm("Tem certeza que deseja APROVAR este aluno?")) {
    await updateDoc(doc(db, "alunos", id), { status: 'aprovado' });
    carregarPendentes(); // Recarrega a lista
  }
};

window.recusarAluno = async (id) => {
  if(confirm("Tem certeza que deseja RECUSAR e apagar este aluno?")) {
    await deleteDoc(doc(db, "alunos", id));
    carregarPendentes(); // Recarrega a lista
  }
};