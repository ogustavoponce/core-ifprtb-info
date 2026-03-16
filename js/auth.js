// ==========================================
// IMPORTAÇÕES DO FIREBASE (Auth e Firestore)
// ==========================================
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, googleProvider, db } from "./firebase-config.js";

// ==========================================
// FUNÇÃO DE SEGURANÇA: CHECAR STATUS DO ALUNO
// ==========================================
async function checarAprovacao(user) {
  const docRef = doc(db, "alunos", user.uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const dados = docSnap.data();
    
    if (dados.status === 'aprovado') {
      alert(`Acesso liberado! Bem-vindo ao CORE, ${user.displayName || dados.nome}.`);
      // O redirecionamento pro Painel de Avisos vai entrar aqui depois!
      // window.location.href = "painel.html"; 
    } else {
      await signOut(auth);
      alert("Acesso negado: Sua conta ainda está aguardando aprovação da liderança.");
    }
  } else {
    await setDoc(docRef, {
      nome: user.displayName || "Aluno(a)",
      email: user.email,
      status: 'pendente',
      dataCriacao: new Date()
    });
    await signOut(auth);
    alert("Solicitação enviada! Como é seu primeiro acesso com o Google, aguarde a aprovação da liderança para entrar.");
  }
}

// ==========================================
// LÓGICA DO BOTÃO GOOGLE (Para Login e Cadastro)
// ==========================================
const btnGoogle = document.getElementById('btn-google'); 
const btnGoogleCadastro = document.getElementById('btn-google-cadastro'); 

const acessarComGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await checarAprovacao(result.user);
  } catch (error) {
    console.error(error);
    alert("Erro ao acessar com o Google.");
  }
};

if (btnGoogle) btnGoogle.addEventListener('click', acessarComGoogle);
if (btnGoogleCadastro) btnGoogleCadastro.addEventListener('click', acessarComGoogle);

// ==========================================
// LÓGICA DO LOGIN MANUAL (E-mail e Senha)
// ==========================================
const btnEntrar = document.getElementById('btn-entrar');

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
// LÓGICA DO CADASTRO MANUAL (E-mail e Senha)
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
      const result = await createUserWithEmailAndPassword(auth, email, senha);
      const user = result.user;
      
      await updateProfile(user, { displayName: nome });

      await setDoc(doc(db, "alunos", user.uid), {
        nome: nome,
        email: email,
        status: 'pendente',
        dataCriacao: new Date()
      });

      await signOut(auth);

      alert(`Solicitação enviada, ${nome}! Aguarde a liberação do seu acesso pela liderança.`);
      window.location.href = "index.html"; 

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

// ==========================================
// LÓGICA DE RECUPERAÇÃO DE SENHA
// ==========================================
const btnRecuperar = document.getElementById('btn-recuperar');

if (btnRecuperar) {
  btnRecuperar.addEventListener('click', async () => {
    const email = document.getElementById('email-recuperar').value;

    if(!email) {
      alert("Por favor, digite o seu e-mail para receber o link.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Tudo certo! Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Verifique sua caixa de entrada e o lixo eletrônico (spam).");
      window.location.href = "index.html"; // Joga de volta pro login
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro ao tentar enviar o e-mail. Verifique se digitou corretamente.");
    }
  });
}