import { signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth, googleProvider } from "./firebase-config.js";

const btnGoogle = document.getElementById('btn-google');

btnGoogle.addEventListener('click', async () => {
  try {
    // Chama o Pop-up do Google
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    console.log("Sucesso! Usuário autenticado:", user);
    alert(`Acesso autorizado! Bem-vindo, ${user.displayName}.`);
    
    // O redirecionamento para o dashboard entrará aqui depois
    // window.location.href = "painel.html";

  } catch (error) {
    console.error("Erro na autenticação:", error.code, error.message);
    alert("Não foi possível acessar. Verifique sua conexão ou tente novamente.");
  }
});