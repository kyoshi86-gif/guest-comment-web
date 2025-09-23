// base.js
import { supabase } from "./supabaseClient.js"

// Lama sesi maksimal (ms) → contoh: 1 jam
const SESSION_EXPIRY = 60 * 60 * 1000 

async function checkAuth() {
  const { data } = await supabase.auth.getSession()

  if (!data.session) {
    window.location.href = "login.html"
    return Promise.reject("Not logged in")
  }

  // Ambil waktu login dari localStorage
  const loginTime = localStorage.getItem("login_time")

  if (!loginTime) {
    // Kalau belum ada, simpan sekarang
    localStorage.setItem("login_time", Date.now())
  } else {
    // Cek selisih waktu
    const elapsed = Date.now() - parseInt(loginTime, 10)
    if (elapsed > SESSION_EXPIRY) {
      // Sudah lebih dari 1 jam → paksa logout
      logout(true)
    }
  }
}

// Logout helper
async function logout(expired = false) {
  await supabase.auth.signOut()
  localStorage.removeItem("supabase.auth.token")
  localStorage.removeItem("login_time")

  if (expired) {
    alert("Anda telah logout")
  }
  window.location.href = "login.html"
}

// Pantau perubahan auth
supabase.auth.onAuthStateChange((event, session) => {
  if (!session) {
    localStorage.removeItem("login_time")
    window.location.href = "login.html"
  }
})

export { checkAuth, logout }
