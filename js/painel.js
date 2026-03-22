import { onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, updateDoc, deleteDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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
      const nomeElement = document.getElementById('user-name');
      if(nomeElement) nomeElement.innerText = user.displayName || docSnap.data().nome;

      if (user.email === EMAIL_ADMIN) {
        document.getElementById('menu-admin').classList.remove('hidden');
        document.getElementById('user-role').innerText = "Presidente / Admin";
        document.getElementById('user-role').classList.replace('text-[var(--color-primary)]', 'text-red-400');
      }
      
      // INICIA O MOTOR DE ESCUTA EM TEMPO REAL DO PAINEL!
      escutarPainelDados();

    } else {
      window.location.href = "index.html"; 
    }
  } else {
    window.location.href = "index.html"; 
  }
});

// ==========================================
// 2. NAVEGAÇÃO SPA
// ==========================================
const navInicio = document.getElementById('nav-inicio');
const navAdmin = document.getElementById('nav-admin');
const viewDashboard = document.getElementById('view-dashboard');
const viewAdmin = document.getElementById('view-admin');
const tituloPagina = document.getElementById('titulo-pagina');

navInicio.addEventListener('click', (e) => {
  e.preventDefault();
  viewDashboard.classList.remove('hidden'); viewAdmin.classList.add('hidden');
  navInicio.classList.add('bg-[var(--color-blue)]', 'text-white'); navInicio.classList.remove('text-[var(--text-muted)]', 'hover:bg-[#2a2a2e]');
  navAdmin.classList.remove('bg-red-500/10', 'text-white'); navAdmin.classList.add('text-red-400');
  tituloPagina.innerText = "Visão Geral";
});

navAdmin.addEventListener('click', (e) => {
  e.preventDefault();
  viewDashboard.classList.add('hidden'); viewAdmin.classList.remove('hidden');
  navAdmin.classList.add('bg-red-500/10', 'text-white'); navAdmin.classList.remove('text-red-400');
  navInicio.classList.remove('bg-[var(--color-blue)]', 'text-white'); navInicio.classList.add('text-[var(--text-muted)]', 'hover:bg-[#2a2a2e]');
  tituloPagina.innerHTML = "<span class='text-red-500'><i class='fa-solid fa-crown mr-2'></i> Painel da Liderança</span>";
  carregarAlunos(); 
});

// ==========================================
// 3. O MOTOR EM TEMPO REAL (Mural, Horários, Café)
// ==========================================
function escutarPainelDados() {
  // O onSnapshot fica olhando o banco 24h por dia
  onSnapshot(doc(db, "painel_dados", "geral"), (documento) => {
    if (documento.exists()) {
      const dados = documento.data();
      
      // Atualiza o Dashboard para os Alunos
      document.getElementById('dash-dia').innerText = dados.horario_dia || 'Hoje';
      document.getElementById('dash-hora1').innerText = dados.hora1 || '--:--';
      document.getElementById('dash-aula1').innerText = dados.aula1 || '...';
      document.getElementById('dash-hora2').innerText = dados.hora2 || '--:--';
      document.getElementById('dash-aula2').innerText = dados.aula2 || '...';
      
      document.getElementById('dash-aviso-titulo').innerText = dados.aviso_titulo || 'Mural Vazio';
      document.getElementById('dash-aviso-texto').innerText = dados.aviso_texto || 'Nenhum recado da liderança no momento.';
      
      const vCafe = parseFloat(dados.cafe_valor) || 0;
      const mCafe = parseFloat(dados.cafe_meta) || 1;
      let porcentagem = (vCafe / mCafe) * 100;
      if (porcentagem > 100) porcentagem = 100; // Limita a barra
      
      document.getElementById('dash-cafe-valor').innerText = `R$ ${vCafe}`;
      document.getElementById('dash-cafe-meta').innerText = `Meta: R$ ${mCafe}`;
      document.getElementById('dash-cafe-barra').style.width = `${porcentagem}%`;

      // Preenche também os campos lá no Admin (pra você não ter que digitar tudo de novo)
      document.getElementById('edit-dia').value = dados.horario_dia || '';
      document.getElementById('edit-hora1').value = dados.hora1 || '';
      document.getElementById('edit-aula1').value = dados.aula1 || '';
      document.getElementById('edit-hora2').value = dados.hora2 || '';
      document.getElementById('edit-aula2').value = dados.aula2 || '';
      document.getElementById('edit-aviso-titulo').value = dados.aviso_titulo || '';
      document.getElementById('edit-aviso-texto').value = dados.aviso_texto || '';
      document.getElementById('edit-cafe-valor').value = dados.cafe_valor || '';
      document.getElementById('edit-cafe-meta').value = dados.cafe_meta || '';
    }
  });
}

// Salva as alterações feitas por você no Admin
window.salvarPainel = async () => {
  const dados = {
    horario_dia: document.getElementById('edit-dia').value,
    hora1: document.getElementById('edit-hora1').value,
    aula1: document.getElementById('edit-aula1').value,
    hora2: document.getElementById('edit-hora2').value,
    aula2: document.getElementById('edit-aula2').value,
    aviso_titulo: document.getElementById('edit-aviso-titulo').value,
    aviso_texto: document.getElementById('edit-aviso-texto').value,
    cafe_valor: document.getElementById('edit-cafe-valor').value,
    cafe_meta: document.getElementById('edit-cafe-meta').value,
  };

  try {
    // Escreve ou atualiza o documento "geral" na coleção "painel_dados"
    await setDoc(doc(db, "painel_dados", "geral"), dados, { merge: true });
    alert("🚀 Painel atualizado para todos os alunos em tempo real!");
  } catch (error) {
    console.error(error);
    alert("Erro ao salvar. Verifique se as regras do Firestore estão corretas.");
  }
};

// ==========================================
// 4. GESTÃO DE ALUNOS (O mesmo de antes)
// ==========================================
async function carregarAlunos() {
  const lista = document.getElementById('lista-pendentes');
  lista.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-[var(--text-muted)]"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Buscando alunos...</td></tr>`;

  try {
    const querySnapshot = await getDocs(collection(db, "alunos"));
    lista.innerHTML = ''; 

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
  }
}

window.aprovarAluno = async (id) => { if(confirm("Liberar acesso?")) { await updateDoc(doc(db, "alunos", id), { status: 'aprovado' }); carregarAlunos(); } };
window.removerAluno = async (id) => { if(confirm("Apagar aluno do sistema permanentemente?")) { await deleteDoc(doc(db, "alunos", id)); carregarAlunos(); } };
window.editarNome = async (id, nomeAtual) => { const novoNome = prompt("Corrija o nome:", nomeAtual); if (novoNome && novoNome.trim() !== "" && novoNome !== nomeAtual) { await updateDoc(doc(db, "alunos", id), { nome: novoNome }); carregarAlunos(); } };
window.resetarSenha = async (email) => { if(confirm(`Enviar e-mail de redefinição para ${email}?`)) { try { await sendPasswordResetEmail(auth, email); alert("Enviado com sucesso!"); } catch (e) { alert("Erro ao enviar o e-mail."); } } };

document.getElementById('btn-sair').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = "index.html"; 
});