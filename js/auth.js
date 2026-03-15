// Importando as ferramentas completas do Firebase Auth
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth, googleProvider } from "./firebase-config.js";

// --- LÓGICA DA TELA DE LOGIN ---
const btnGoogle = document.getElementById('btn-google');
const btnEntrar = document.getElementById('btn-entrar');

if (btnGoogle) {
  btnGoogle.addEventListener('click', async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      alert(`Acesso autorizado via Google! Bem-vindo, ${result.user.displayName}.`);
      // window.location.href = "painel.html"; // Futuro redirecionamento
    } catch (error) {
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
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      alert(`Acesso autorizado! Bem-vindo de volta.`);
      // window.location.href = "painel.html"; // Futuro redirecionamento
    } catch (error) {
      console.error(error);
      alert("Erro no login. Verifique se o e-mail e a senha estão corretos.");
    }
  });
}

// --- LÓGICA DA TELA DE CADASTRO ---
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
      // Cria o usuário no banco de dados
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      
      // Salva o nome do aluno no perfil dele
      await updateProfile(userCredential.user, { displayName: nome });

      alert(`Conta criada com sucesso, ${nome}! Agora você já pode fazer login.`);
      
      // Manda ele de volta pra tela de login
      window.location.href = "index.html";

    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        alert("Esse e-mail já está cadastrado.");
      } else if (error.code === 'auth/weak-password') {
        alert("A senha é muito fraca. Digite pelo menos 6 caracteres.");
      } else {
        alert("Erro ao criar conta. Tente novamente.");
      }
    }
  });
}