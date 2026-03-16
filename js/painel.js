import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// 1. O SEGURANÇA DA PORTA (Verifica se o usuário pode estar aqui)
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Está logado. Vamos conferir no banco se ele está "aprovado"
    const docRef = doc(db, "alunos", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().status === 'aprovado') {
      // Tudo certo! Mostra o nome dele na tela
      const nomeElement = document.getElementById('user-name');
      if(nomeElement) {
        nomeElement.innerText = user.displayName || docSnap.data().nome;
      }
    } else {
      // Tá logado, mas não tá aprovado. Chuta pro login.
      window.location.href = "index.html";
    }
  } else {
    // Não tem ninguém logado. Chuta pro login.
    window.location.href = "index.html";
  }
});

// 2. BOTÃO DE SAIR
const btnSair = document.getElementById('btn-sair');
if (btnSair) {
  btnSair.addEventListener('click', async () => {
    try {
      await signOut(auth);
      // Redireciona para o login após sair
      window.location.href = "index.html"; 
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  });
}