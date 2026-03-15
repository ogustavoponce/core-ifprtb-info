// ==========================================
// IMPORTAÇÕES DO FIREBASE (Auth e Firestore)
// ==========================================
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
      
      // O redirecionamento pro Painel de Avisos vai entrar aqui depois!
      // window.location.href = "painel.html"; 
      
    } else {
      // Se não aprovou, expulsa o usuário (desloga) e avisa
      await signOut(auth);
      alert("Acesso negado: Sua conta ainda está aguardando aprovação da liderança.");
    }
  } else {
    // Se o aluno tentou logar/cadastrar com o Google pela PRIMEIRA VEZ
    await setDoc(docRef, {
      nome: user.displayName || "Aluno(a)",
      email: user.email,
      status: 'pendente',
      dataCriacao: new Date()
    });
    
    // Expulsa para ele não entrar direto
    await signOut(auth);
    alert("Solicitação enviada! Como é seu primeiro acesso com o Google, aguarde a aprovação da liderança para entrar.");
  }
}

// ==========================================
// LÓGICA DO BOTÃO GOOGLE (Para Login e Cadastro)
// ==========================================
const btnGoogle = document.getElementById('btn-google'); // Botão da tela index
const btnGoogleCadastro = document.getElementById('btn-google-cadastro'); // Botão da tela de cadastro

const acessarComGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Assim que ele loga com o Google, joga na função de segurança para ver se pode entrar
    await checarAprovacao(result.user);
  } catch (error) {
    console.error(error);
    alert("Erro ao acessar com o Google.");
  }
};

// Se os botões existirem na tela que o usuário abriu, liga a função de clique neles
if (btnGoogle) {
  btnGoogle.addEventListener('click', acessarComGoogle);
}
if (btnGoogleCadastro) {
  btnGoogleCadastro.addEventListener('click', acessarComGoogle);
}

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
      // Tenta fazer o login
      const result = await signInWithEmailAndPassword(auth, email, senha);
      // Se a senha estiver certa, joga na função de segurança para ver se a liderança aprovou
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
      // 1. Cria a conta base no Firebase Auth
      const result = await createUserWithEmailAndPassword(auth, email, senha);
      const user = result.user;
      
      // 2. Salva o nome do aluno no perfil da conta
      await updateProfile(user, { displayName: nome });

      // 3. Cria a ficha do aluno no Banco de Dados (Firestore) com status 'pendente'
      await setDoc(doc(db, "alunos", user.uid), {
        nome: nome,
        email: email,
        status: 'pendente',
        dataCriacao: new Date()
      });

      // 4. Desloga imediatamente para ele não invadir o sistema antes da aprovação
      await signOut(auth);

      alert(`Solicitação enviada, ${nome}! Aguarde a liberação do seu acesso pela liderança.`);
      
      // Joga ele de volta pra porta de entrada (Login)
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