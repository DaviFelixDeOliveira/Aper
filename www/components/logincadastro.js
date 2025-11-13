// ==== ELEMENTOS & HELPERS ====
const tela = document.querySelector(".tela-preacesso");
const loginErro = document.getElementById("login-erro");
const cadastroErro = document.getElementById("cadastro-erro");

const mostrarErroGlobal = (el) => (el.style.opacity = "1");
const esconderErroGlobal = (el) => (el.style.opacity = "0");

// === FUNÇÕES DE AUTENTICAÇÃO ===
async function fazerLogin(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    console.error(error.message);
    mostrarErroGlobal(loginErro);
    return;
  }

  const nome =
    data.user.user_metadata?.nome ||
    data.user.user_metadata?.name ||
    data.user.user_metadata?.username ||
    "erro";

  // 💾 Salva tudo no localStorage
  localStorage.setItem("usuario_id", data.user.id);
  localStorage.setItem("usuario_email", data.user.email);
  localStorage.setItem("usuario_nome", nome);

  console.log("Login ok:", data.user);
  location.href = "principal.html";
  carregarPagina("paginas/inicio.html", function () {
    if (typeof initInicio === "function") initInicio();
  });
}

async function fazerCadastro(nome, email, senha) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });
  if (error) {
    console.error(error.message);
    mostrarErroGlobal(cadastroErro);
    return;
  }
  console.log("Usuário criado:", data.user);
  localStorage.setItem("usuario", JSON.stringify(data.user));
  location.href = "principal.html";
}

// ==== INICIALIZAÇÃO DO JUSTVALIDATE ====
let loginValidate, cadastroValidate;
document.addEventListener("DOMContentLoaded", () => {
  const commonOpts = {
    errorLabelCssClass: "preacesso-erro-individual",
    errorFieldCssClass: "campo-erro",
    focusInvalidField: true,
    lockForm: true,
  };

  // LOGIN
  loginValidate = new JustValidate("#login-itens", commonOpts);
  loginValidate
    .addField("#login-email", [
      { rule: "required", errorMessage: "E-mail é obrigatório" },
      { rule: "email", errorMessage: "E-mail inválido" },
    ])
    .addField("#login-senha", [
      { rule: "required", errorMessage: "Senha é obrigatória" },
      {
        rule: "minLength",
        value: 6,
        errorMessage: "Senha deve ter pelo menos 6 caracteres",
      },
    ])
    .onSuccess(() => {
      const email = document.getElementById("login-email").value.trim();
      const senha = document.getElementById("login-senha").value.trim();
      esconderErroGlobal(loginErro);
      fazerLogin(email, senha);
    });

  // CADASTRO
  cadastroValidate = new JustValidate("#cadastro-itens", commonOpts);
  cadastroValidate
    .addField("#cadastro-nome", [
      { rule: "required", errorMessage: "Nome é obrigatório" },
      {
        rule: "minLength",
        value: 3,
        errorMessage: "Nome deve ter pelo menos 3 letras",
      },
    ])
    .addField("#cadastro-email", [
      { rule: "required", errorMessage: "E-mail é obrigatório" },
      { rule: "email", errorMessage: "E-mail inválido" },
    ])
    .addField("#cadastro-senha", [
      { rule: "required", errorMessage: "Senha é obrigatória" },
      { rule: "minLength", value: 6, errorMessage: "Mínimo de 6 caracteres" },
    ])
    .addField("#cadastro-acordo", [
      {
        rule: "required",
        errorMessage: "Você deve aceitar os Termos de Serviço",
      },
    ])
    .onSuccess(() => {
      const nome = document.getElementById("cadastro-nome").value.trim();
      const email = document.getElementById("cadastro-email").value.trim();
      const senha = document.getElementById("cadastro-senha").value.trim();
      esconderErroGlobal(cadastroErro);
      fazerCadastro(nome, email, senha);
    });

  cadastroValidate.onFail(() => {
    const checkbox = document.getElementById("cadastro-acordo");
    if (!checkbox.checked) {
      checkbox.classList.add("erro");
      setTimeout(() => checkbox.classList.remove("erro"), 400);
    }
  });

  // esconder mensagens globais quando usuário digita
  [
    "login-email",
    "login-senha",
    "cadastro-nome",
    "cadastro-email",
    "cadastro-senha",
  ].forEach((id) => {
    const ev = document.getElementById(id);
    if (ev)
      ev.addEventListener("input", () => {
        esconderErroGlobal(loginErro);
        esconderErroGlobal(cadastroErro);
      });
  });

  const acordo = document.getElementById("cadastro-acordo");
  if (acordo)
    acordo.addEventListener("change", () => esconderErroGlobal(cadastroErro));
});

// ==== UI: alternar telas ====
function alternarTela(tipo) {
  tela.classList.toggle(`mostrar-${tipo}`);
  const ativo = tela.classList.contains(`mostrar-${tipo}`);
  tela.style.setProperty("--blur-before", ativo ? "5px" : "1px");
  tela.style.setProperty("--brightness-before", ativo ? "0.5" : "1");

  if (!ativo) {
    setTimeout(() => {
      document.querySelectorAll(`#${tipo}-itens input`).forEach((i) => {
        if (i.type === "checkbox") i.checked = false;
        else i.value = "";
      });
      if (tipo === "login" && loginValidate) loginValidate.refresh();
      if (tipo === "cadastro" && cadastroValidate) cadastroValidate.refresh();
      esconderErroGlobal(loginErro);
      esconderErroGlobal(cadastroErro);
    }, 1000);
  }
}

document.getElementById("preacesso-botao-entrar").onclick = () =>
  alternarTela("login");
document.getElementById("preacesso-botao-cadastrar").onclick = () =>
  alternarTela("cadastro");
document.getElementById("login-botao-voltar").onclick = () =>
  alternarTela("login");
document.getElementById("cadastro-botao-voltar").onclick = () =>
  alternarTela("cadastro");
