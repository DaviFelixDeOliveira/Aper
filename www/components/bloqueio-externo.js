// 1. BLOQUEIA beforeunload (tentativa de fechar app)
window.addEventListener("beforeunload", function (e) {
  e.preventDefault();
  e.returnValue = "Você não pode sair do app";
  // Impede completamente o fechamento
  return false;
});
