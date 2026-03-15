// Importando as bibliotecas direto da fonte oficial do Google (Padrão ES Modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// SUBSTITUA PELAS SUAS CHAVES DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCAL51WMCzbGwfPY0Ly-H-lOEnNG7yk4MA",
  authDomain: "core-info-70163.firebaseapp.com",
  projectId: "core-info-70163",
  storageBucket: "core-info-70163.firebasestorage.app",
  messagingSenderId: "225330144957",
  appId: "1:225330144957:web:5fd4cac64c91928ddbb9d4"
};

// Inicializando a infraestrutura
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);