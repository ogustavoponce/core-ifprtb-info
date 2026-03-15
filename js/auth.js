// Importando as ferramentas do Firebase Auth e do Firestore (Banco de Dados)
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, googleProvider, db } from "./firebase-config.js";

// ==========================================
// FUNÇÃO DE SEGURANÇA: CHECAR STATUS DO ALUNO
// ==========================================
async function checarAprovacao(user) {
  // Procura a ficha do aluno no banco de dados
  const docRef = doc(db, "alunos", user.uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const dados = docSnap.data();
    
    // Se a liderança aprovou, a porta abre!
    if (dados.status === 'aprovado') {
      alert(`Acesso liberado! Bem-vindo ao CORE, ${user.displayName || dados.nome}.`);
      // Aqui entrará: window.location.href = "painel.html";
    } else {
      // Se não aprovou, expulsa o usuário (desloga) e avisa
      await signOut(auth);
      alert("Acesso negado: Sua conta ainda está aguardando aprovação da liderança.");
    }
  } else {
    // Se o aluno tentou logar direto com o Google sem ter se cadastrado antes
    await setDoc(docRef, {
      nome: user.displayName,
      email: user.email,
      status: 'pendente',
      dataCriacao: new Date()
    });
    await signOut(auth);
    alert("Solicitação enviada! Como é seu primeiro acesso com o Google, aguarde a aprovação para entrar.");
  }
}

// ==========================================
// LÓGICA DA TELA DE LOGIN (index.html)
// ==========================================
const btnGoogle = document.getElementById('btn-google');
const btnEntrar = document.getElementById('btn-entrar');

if (btnGoogle) {
  btnGoogle.addEventListener('click', async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await checarAprovacao(result.user);
    } catch (error) {
      console.error(error);
      alert("Erro ao acessar com o Google.");
    }
  });
}

if (btnEntrar) {
  btnEntrar.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    if(!email || !senha) {
      alert("Por favor, preencha o e-mail e a senha.");
      return;
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, senha);
      await checarAprovacao(result.user);
    } catch (error) {
      console.error(error);
      alert("Erro no login. Verifique se o e-mail e a senha estão corretos.");
    }
  });
}

// ==========================================
// LÓGICA DA TELA DE CADASTRO (cadastro.html)
// ==========================================
const btnCadastrar = document.getElementById('btn-cadastrar');

if (btnCadastrar) {
  btnCadastrar.addEventListener('click', async () => {
    const nome = document.getElementById('nome-cadastro').value;
    const email = document.getElementById('email-cadastro').value;
    const senha = document.getElementById('senha-cadastro').value;

    if(!nome || !email || !senha) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    try {
      // 1. Cria a conta base
      const result = await createUserWithEmailAndPassword(auth, email, senha);
      const user = result.user;
      
      // 2. Salva o nome no perfil
      await updateProfile(user, { displayName: nome });

      // 3. Cria a ficha do aluno no Banco de Dados com status 'pendente'
      await setDoc(doc(db, "alunos", user.uid), {
        nome: nome,
        email: email,
        status: 'pendente',
        dataCriacao: new Date()
      });

      // 4. Desloga imediatamente para ele não invadir o sistema
      await signOut(auth);

      alert(`Solicitação enviada, ${nome}! Aguarde a liberação do seu acesso pela liderança.`);
      window.location.href = "index.html"; // Joga ele de volta pra porta de entrada

    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        alert("Esse e-mail já está cadastrado.");
      } else if (error.code === 'auth/weak-password') {
        alert("A senha é muito fraca. Digite pelo menos 6 caracteres.");
      } else {
        alert("Erro ao criar conta. Verifique o console.");
      }
    }
  });
}