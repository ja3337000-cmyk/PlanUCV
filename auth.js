import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* Estos 4 datos salen de Firebase: Configuración del proyecto > Tus apps > Configuración del SDK */
const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: ""
};

const configurado = Object.values(firebaseConfig).every(Boolean);
const auth = configurado ? getAuth(initializeApp(firebaseConfig)) : null;
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

window.loginConGoogle = async () => {
    if (!configurado) {
        mostrarToastLogin("Falta pegar los datos de Firebase en auth.js.");
        return;
    }

    const btn = document.getElementById("googleLoginBtn");
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = "Conectando…";
    document.getElementById("loginMessage").classList.remove("show");

    try {
        await signInWithPopup(auth, provider);
    } catch (e) {
        const mensajes = {
            "auth/popup-closed-by-user": "Cerraste la ventana antes de terminar.",
            "auth/popup-blocked": "El navegador bloqueó la ventana emergente. Permítela e inténtalo de nuevo.",
            "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase.",
            "auth/network-request-failed": "Sin conexión. Revisa tu internet."
        };
        mostrarToastLogin(mensajes[e.code] || "No se pudo iniciar sesión. Inténtalo otra vez.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
};

window.cerrarSesion = () => (auth ? signOut(auth) : mostrarLogin());

if (auth) {
    onAuthStateChanged(auth, user => {
        const aplicar = () => {
            if (user) {
                window.nombreGoogle = (user.displayName || "").split(" ")[0];
                window.fotoGoogle = user.photoURL || "";
                cargarDatosUsuario(user.uid);
                mostrarAplicacion();
            } else {
                mostrarLogin();
            }
        };
        document.readyState === "loading"
            ? document.addEventListener("DOMContentLoaded", aplicar)
            : aplicar();
    });
}