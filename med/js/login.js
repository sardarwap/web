import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('errorMsg');

    try {
        loginBtn.innerText = "Authenticating...";
        loginBtn.disabled = true;
        errorMsg.style.display = "none";

        // Try to log in
        await signInWithEmailAndPassword(auth, email, password);
        
        // Success! Redirect to admin panel
        window.location.href = "admin.html";

    } catch (error) {
        console.error(error);
        errorMsg.innerText = "Invalid email or password.";
        errorMsg.style.display = "block";
        loginBtn.innerText = "Secure Login";
        loginBtn.disabled = false;
    }
});