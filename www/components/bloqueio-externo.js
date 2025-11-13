// BLOQUEADOR DE FECHAMENTO DO APP
console.log('🚫 BLOQUEADOR DE FECHAMENTO ATIVADO');

// 1. BLOQUEIA beforeunload (tentativa de fechar app)
window.addEventListener('beforeunload', function(e) {
    console.log('🚫 TENTATIVA DE FECHAR APP BLOQUEADA');
    e.preventDefault();
    e.returnValue = 'Você não pode sair do app';
    
    // Mostra alerta para o usuário
    alert('Ação bloqueada: Não é permitido sair do app');
    
    // Impede completamente o fechamento
    return false;
});

// 2. BLOQUEIA unload (quando a página está descarregando)
window.addEventListener('unload', function(e) {
    console.log('🚫 UNLOAD BLOQUEADO');
    e.preventDefault();
    return false;
});

// 3. BLOQUEIA pagehide (página sendo escondida)
window.addEventListener('pagehide', function(e) {
    console.log('🚫 PAGEHIDE BLOQUEADO');
    e.preventDefault();
    return false;
});

// 4. FORÇA o app a manter o foco
let focusInterval;
function manterFoco() {
    focusInterval = setInterval(() => {
        if (document.hidden) {
            console.log('🔍 App em segundo plano - tentando trazer para frente');
            // Tenta trazer o app para frente (não funciona em todos os casos)
            window.focus();
        }
    }, 100);
}

manterFoco();

// 5. BLOQUEADOR NUCLEAR - Remove completamente a capacidade de fechar
Object.defineProperty(window, 'close', {
    value: function() {
        console.log('🚫 window.close() BLOQUEADO');
        alert('Fechamento do app bloqueado');
        return null;
    },
    writable: false,
    configurable: false
});

console.log('✅ Bloqueador de fechamento configurado!');