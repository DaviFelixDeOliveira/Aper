// authgoogle.js

console.log("✅ authgoogle.js carregado");

// Debug completo dos plugins
console.log("🔧 DEBUG CORDOVA:", {
    cordova: !!window.cordova,
    device: !!window.device,
    inappbrowser: !!window.cordova?.InAppBrowser,
    plugins: window.cordova?.plugins || 'no plugins object'
});

document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('🎉 DEVICE READY - Cordova inicializado');
    
    // Debug detalhado dos plugins
    console.log('🔧 PLUGINS NO DEVICE READY:', {
        cordova: window.cordova?.version,
        platform: window.device?.platform,
        inappbrowser: typeof window.cordova?.InAppBrowser,
        customurl: typeof window.cordova?.plugins?.CustomURLScheme,
        allPlugins: Object.keys(window.cordova?.plugins || {})
    });
    
    // Testa o InAppBrowser manualmente
    if (window.cordova?.InAppBrowser) {
        console.log('🧪 InAppBrowser test - disponível');
        // Teste simples
        window.testInAppBrowser = function() {
            const ref = window.cordova.InAppBrowser.open('https://google.com', '_blank', 'location=yes');
            ref.addEventListener('loadstart', (e) => console.log('Teste loadstart:', e.url));
            ref.addEventListener('exit', () => console.log('Teste exit'));
        };
    } else {
        console.error('❌ InAppBrowser NÃO disponível no deviceReady');
    }
    
    window.handleOpenURL = function(url) {
        console.log("🎯 URL custom scheme recebida:", url);
        setTimeout(() => processAuthCallback(url), 100);
    };
}

async function loginWithGoogle() {
    console.log("🎪 Iniciando login com Google...");
    
    // Verifica novamente os plugins - CORRIGIDO: usa window.cordova
    console.log('🔍 Plugins no momento do clique:', {
        inappbrowser: !!window.cordova?.InAppBrowser,
        customurl: !!window.cordova?.plugins?.CustomURLScheme
    });
    
    if (!window.cordova?.InAppBrowser) {
        alert('❌ InAppBrowser não carregado. Aguarde o app inicializar completamente.');
        console.error('Cordova:', window.cordova);
        console.error('InAppBrowser:', window.cordova?.InAppBrowser);
        return;
    }

    try {
        const redirectUrl = 'aper://auth-callback';
        console.log("📍 Redirect URL:", redirectUrl);

        const { data, error } = await window.supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: redirectUrl,
                skipBrowserRedirect: true,
            }
        });

        if (error) throw error;

        if (data?.url) {
            console.log("🌐 URL de autenticação recebida:", data.url);
            openAuthBrowser(data.url);
        } else {
            throw new Error("URL de autenticação não retornada");
        }
        
    } catch (err) {
        console.error("💥 Erro no login com Google:", err);
        alert("Erro: " + err.message);
    }
}

function openAuthBrowser(url) {
    console.log("📱 Tentando abrir navegador...");
    
    if (window.cordova && window.cordova.InAppBrowser) {
        console.log("✅ InAppBrowser encontrado - abrindo no navegador do sistema");
        
        // Use '_system' em vez de '_blank' para abrir no navegador padrão
        const ref = window.cordova.InAppBrowser.open(url, '_system', 'location=yes');
        
        console.log("🔗 Referência do browser:", ref);
        
        // Monitora quando o navegador fecha (quando o usuário volta pro app)
        ref.addEventListener('exit', function(event) {
            console.log("🔚 Navegador do sistema fechado - usuário voltou ao app");
            
            // Quando o usuário volta, verifica se está autenticado
            checkAuthenticationStatus();
        });
        
    } else {
        console.error("❌ InAppBrowser não disponível");
        alert("Plugin InAppBrowser não carregado.");
    }
}

// Função para verificar se o usuário está autenticado após voltar do navegador
async function checkAuthenticationStatus() {
    console.log("🔍 Verificando status de autenticação...");
    
    try {
        const { data, error } = await window.supabase.auth.getSession();
        
        if (error) {
            console.error("❌ Erro ao verificar sessão:", error);
            return;
        }
        
        if (data.session) {
            console.log("✅ Usuário autenticado! Sessão encontrada:", data.session.user.email);
            
            // Salva informações do usuário
            localStorage.setItem("usuario_id", data.session.user.id);
            localStorage.setItem("usuario_email", data.session.user.email);
            localStorage.setItem("usuario_nome", 
                data.session.user.user_metadata?.name || 
                data.session.user.user_metadata?.full_name || 
                data.session.user.email?.split('@')[0] || 
                "Usuário"
            );
            
            console.log("🚀 Redirecionando para principal.html...");
            window.location.href = "principal.html";
        } else {
            console.log("❌ Nenhuma sessão encontrada - usuário não autenticado");
            alert("Login não concluído. Tente novamente.");
        }
        
    } catch (error) {
        console.error("💥 Erro ao verificar autenticação:", error);
    }
}

async function processAuthCallback(url) {
    console.log("🔄 Processando callback:", url);
    
    try {
        // Converte URL para formato válido
        const urlObj = new URL(url.replace('aper://', 'http://'));
        const hashParams = new URLSearchParams(urlObj.hash.substring(1));
        
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');
        
        console.log("🔑 Tokens extraídos:", { 
            access_token: !!access_token, 
            refresh_token: !!refresh_token 
        });

        if (!access_token) {
            throw new Error("Access token não encontrado na URL");
        }

        const { data, error } = await window.supabase.auth.setSession({
            access_token,
            refresh_token
        });

        if (error) throw error;

        console.log("✅ Sessão configurada com sucesso:", data.user?.email);
        
        // Salva informações do usuário
        if (data.user) {
            localStorage.setItem("usuario_id", data.user.id);
            localStorage.setItem("usuario_email", data.user.email);
            localStorage.setItem("usuario_nome", 
                data.user.user_metadata?.name || 
                data.user.user_metadata?.full_name || 
                data.user.email?.split('@')[0] || 
                "Usuário"
            );
            console.log("💾 Dados salvos no localStorage");
        }
        
        // Redireciona para a tela principal
        console.log("🚀 Redirecionando para principal.html...");
        window.location.href = "principal.html";
        
    } catch (error) {
        console.error("💥 Erro no processamento do callback:", error);
        alert("Erro na autenticação: " + error.message);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ DOM carregado - Configurando botão Google");
    const googleLoginBtn = document.getElementById('google-login');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', function() {
            console.log("🖱️ Botão Google clicado");
            
            // Verifica se o device ready já aconteceu
            if (!window.cordova) {
                alert("⚠️ Aguarde o app carregar completamente antes de fazer login.");
                return;
            }
            
            loginWithGoogle();
        });
        console.log("✅ Botão Google configurado com sucesso");
    }
});

// Função de teste manual
window.testeAuth = function() {
    console.log("🧪 Testando autenticação manualmente...");
    if (window.cordova?.InAppBrowser) {
        console.log("✅ InAppBrowser disponível para teste");
        window.cordova.InAppBrowser.open('https://google.com', '_blank', 'location=yes');
    } else {
        console.error("❌ InAppBrowser não disponível");
    }
};