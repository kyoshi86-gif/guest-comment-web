// Ambil createClient dari global supabase (karena kita pakai CDN)
const { createClient } = supabase

// Ganti dengan Project URL dan anon key dari Supabase
const SUPABASE_URL = "https://drdflrzsvfakdnhqniaa.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8"

// Buat client
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

document.addEventListener("DOMContentLoaded", () => {
  const btnLogin = document.getElementById("btnLogin")

  // Klik tombol login
  btnLogin.addEventListener("click", login)

  // Tekan Enter = klik tombol login
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault()
      btnLogin.click()
    }
  })
})

async function login() {
  const email = document.getElementById("email").value
  const password = document.getElementById("password").value
  const errorMsg = document.getElementById("error-msg")

  console.log("Trying login with:", email)

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    console.error("Login error:", error)
    errorMsg.textContent = "Login gagal: " + error.message
    return
  }

  console.log("Login success:", data)

  // Ambil role user dari tabel user_roles
  const { data: roleData, error: roleError } = await supabaseClient
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle()

  if (roleError) {
    console.error("Role fetch error:", roleError)
    errorMsg.textContent = "Gagal ambil role: " + roleError.message
    return
  }

  if (!roleData) {
    errorMsg.textContent = "User belum punya role di tabel user_roles"
    return
  }

  // Simpan session di localStorage
  localStorage.setItem("supabase.auth.token", JSON.stringify(data.session))
  localStorage.setItem("user_role", roleData.role)

  window.location.href = "/index"
}
