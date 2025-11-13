// ===== CÓDIGO DO PRINCIPAL.HTML =====
document.addEventListener("DOMContentLoaded", async () => {
  let usuarioLocal = localStorage.getItem("usuario_id");

  // AGORA SUPABASE JÁ ESTÁ INICIALIZADO
  const { data: sessionData } = await window.supabase.auth.getSession();
  const sessaoSupabase = sessionData?.session;

  if (!usuarioLocal && !sessaoSupabase) {
    window.location.href = "logincadastro.html";
    return;
  }

  if (sessaoSupabase) {
    const user = sessaoSupabase.user;
    localStorage.setItem("usuario_id", user.id);
    localStorage.setItem(
      "usuario_nome",
      user.user_metadata.full_name || "Usuário"
    );
    localStorage.setItem("usuario_email", user.email);
    localStorage.setItem("usuario_foto", user.user_metadata.avatar_url || "");
    localStorage.setItem("usuario_google", "true");
  }
});

function abrirPopup(titulo, aoConfirmar) {
  const overlay = document.getElementById("popup-overlay");
  const popup = document.querySelector(".popup-confirmacao");
  const tituloLabel = document.getElementById("popup-titulo-confirmacao");
  const btnConfirmar = document.getElementById("popup-confirmacao-confirmar");
  const btnCancelar = document.getElementById("popup-confirmacao-cancelar");

  tituloLabel.textContent = titulo;

  overlay.style.display = "block";
  popup.style.display = "flex";

  // Forçar reflow para ativar a transição
  void popup.offsetWidth;
  void overlay.offsetWidth;

  overlay.style.opacity = "1";
  popup.style.opacity = "1";

  btnConfirmar.onclick = () => {
    aoConfirmar();
    fecharPopup();
  };

  btnCancelar.onclick = fecharPopup;
  overlay.onclick = fecharPopup;

  function fecharPopup() {
    overlay.style.opacity = "0";
    popup.style.opacity = "0";

    setTimeout(() => {
      overlay.style.display = "none";
      popup.style.display = "none";
    }, 300); // mesmo tempo da transição
  }
}

// ------------------------
// INIT INÍCIO - VERSÃO SIMPLES
// ------------------------
async function initInicio() {
  const userId = localStorage.getItem("usuario_id");
  const apiKey = "e293e84786f06c94bf36414cc9240da4";
  const container = document.querySelector(".container-sugeridos");

  if (!userId || !container) return;

  try {
    const { data: likedWorks } = await window.supabase
      .from("liked_works")
      .select("work_id")
      .eq("user_id", userId);

    if (!likedWorks || likedWorks.length === 0) return;

    // Analisar gêneros preferidos
    const generosPreferidos = await analisarGenerosPreferidos(
      likedWorks,
      apiKey
    );

    // Gerar múltiplas playlists
    await gerarPlaylistsSimples(generosPreferidos, container, apiKey);
  } catch (err) {
    console.error("Erro ao gerar playlists personalizadas:", err);
  }

  // ---- CLIQUE NAS OBRAS ----
  const obras = document.querySelectorAll(".obra");
  obras.forEach((obra) => {
    obra.addEventListener("click", () => {
      const navbar = document.querySelector(".navbar");
      if (navbar) navbar.classList.add("navbar-esconde");
      const id = obra.dataset.id;
      const tipo = obra.dataset.tipo || "movie";

      if (id) {
        console.log(`🎬 Abrindo ${tipo}:`, id);
        carregarPagina("paginas/assistir.html", function () {
          if (typeof initAssistir === "function") {
            initAssistir(id, tipo);
          }
        });
      } else {
        console.warn("❗ Nenhum data-id encontrado para esta obra.");
      }
    });
  });

  // MOSTRAR CONTAINER APÓS GERAR TUDO
  container.style.opacity = "1";
}

// ------------------------
// ANÁLISE DE GÊNEROS PREFERIDOS
// ------------------------
async function analisarGenerosPreferidos(likedWorks, apiKey) {
  let generos = {};

  for (const work of likedWorks.slice(0, 15)) {
    let detalhes = null;

    let res = await fetch(
      `https://api.themoviedb.org/3/movie/${work.work_id}?api_key=${apiKey}&language=pt-BR`
    );
    if (res.ok) {
      detalhes = await res.json();
    } else {
      res = await fetch(
        `https://api.themoviedb.org/3/tv/${work.work_id}?api_key=${apiKey}&language=pt-BR`
      );
      if (res.ok) detalhes = await res.json();
    }

    if (!detalhes || detalhes.status_code === 34) continue;

    if (detalhes.genres) {
      detalhes.genres.forEach((g) => {
        generos[g.id] = (generos[g.id] || 0) + 1;
      });
    }
  }

  return Object.entries(generos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map((item) => item[0]);
}

// ------------------------
// GERAR MÚLTIPLAS PLAYLISTS SIMPLES
// ------------------------
async function gerarPlaylistsSimples(generosPreferidos, container, apiKey) {
  if (generosPreferidos.length === 0) return;

  // Playlist do gênero principal
  await gerarPlaylistPorGenero(generosPreferidos[0], container, apiKey);

  // Playlist do segundo gênero (se existir)
  if (generosPreferidos.length > 1) {
    await gerarPlaylistPorGenero(generosPreferidos[1], container, apiKey);
  }

  // Playlist de tendências
  await gerarPlaylistTendencias(container, apiKey);

  // Playlist de descobertas (mix de gêneros)
  if (generosPreferidos.length > 2) {
    await gerarPlaylistDescobertas(generosPreferidos, container, apiKey);
  }
}

// ------------------------
// GERAR PLAYLIST POR GÊNERO
// ------------------------
async function gerarPlaylistPorGenero(generoId, container, apiKey) {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=${generoId}&sort_by=popularity.desc`
    );
    const data = await res.json();

    if (!data.results?.length) return;

    const titulo = gerarTituloPorGenero(generoId);

    const playlistDiv = document.createElement("div");
    playlistDiv.classList.add("lista");
    playlistDiv.innerHTML = `
      <div class="lista-cabecalho">
        <label class="lista-titulo">${titulo}</label>
        <label class="lista-ver">Ver mais</label>
      </div>
      <div class="lista-obras"></div>
    `;

    const obrasDiv = playlistDiv.querySelector(".lista-obras");

    for (const filme of data.results.slice(0, 10)) {
      const obraDiv = document.createElement("div");
      obraDiv.classList.add("obra");
      obraDiv.dataset.id = filme.id;
      obraDiv.dataset.tipo = "movie";
      obraDiv.innerHTML = `
        <div class="obra-capa" style="background-image:url('https://image.tmdb.org/t/p/w500${
          filme.backdrop_path || filme.poster_path
        }')"></div>
        <label class="obra-nome">${filme.title}</label>
      `;
      obrasDiv.appendChild(obraDiv);
    }

    // Configurar botão "Ver mais"
    const botaoVerMais = playlistDiv.querySelector(".lista-ver");
    configurarBotaoVerMaisPlaylist(botaoVerMais, generoId, titulo);

    container.prepend(playlistDiv);
  } catch (err) {
    console.error("Erro ao gerar playlist:", err);
  }
}

// ------------------------
// GERAR PLAYLIST DE TENDÊNCIAS
// ------------------------
async function gerarPlaylistTendencias(container, apiKey) {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}&language=pt-BR`
    );
    const data = await res.json();

    if (!data.results?.length) return;

    const playlistDiv = document.createElement("div");
    playlistDiv.classList.add("lista");
    playlistDiv.innerHTML = `
      <div class="lista-cabecalho">
        <label class="lista-titulo">Em Alta Agora</label>
        <label class="lista-ver">Ver mais</label>
      </div>
      <div class="lista-obras"></div>
    `;

    const obrasDiv = playlistDiv.querySelector(".lista-obras");

    for (const filme of data.results.slice(0, 10)) {
      const obraDiv = document.createElement("div");
      obraDiv.classList.add("obra");
      obraDiv.dataset.id = filme.id;
      obraDiv.dataset.tipo = "movie";
      obraDiv.innerHTML = `
        <div class="obra-capa" style="background-image:url('https://image.tmdb.org/t/p/w500${
          filme.backdrop_path || filme.poster_path
        }')"></div>
        <label class="obra-nome">${filme.title}</label>
      `;
      obrasDiv.appendChild(obraDiv);
    }

    // Configurar botão "Ver mais" para tendências
    const botaoVerMais = playlistDiv.querySelector(".lista-ver");
    configurarBotaoVerMaisPlaylist(botaoVerMais, "trending", "Em Alta Agora");

    container.prepend(playlistDiv);
  } catch (err) {
    console.error("Erro ao gerar playlist de tendências:", err);
  }
}

// ------------------------
// GERAR PLAYLIST DE DESCOBERTAS
// ------------------------
async function gerarPlaylistDescobertas(generosPreferidos, container, apiKey) {
  try {
    const generosMix = generosPreferidos.slice(0, 2).join(",");

    const res = await fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=${generosMix}&sort_by=vote_count.desc`
    );
    const data = await res.json();

    if (!data.results?.length) return;

    const playlistDiv = document.createElement("div");
    playlistDiv.classList.add("lista");
    playlistDiv.innerHTML = `
      <div class="lista-cabecalho">
        <label class="lista-titulo">Recomendados para Você</label>
        <label class="lista-ver">Ver mais</label>
      </div>
      <div class="lista-obras"></div>
    `;

    const obrasDiv = playlistDiv.querySelector(".lista-obras");

    for (const filme of data.results.slice(0, 10)) {
      const obraDiv = document.createElement("div");
      obraDiv.classList.add("obra");
      obraDiv.dataset.id = filme.id;
      obraDiv.dataset.tipo = "movie";
      obraDiv.innerHTML = `
        <div class="obra-capa" style="background-image:url('https://image.tmdb.org/t/p/w500${
          filme.backdrop_path || filme.poster_path
        }')"></div>
        <label class="obra-nome">${filme.title}</label>
      `;
      obrasDiv.appendChild(obraDiv);
    }

    // Configurar botão "Ver mais" para descobertas
    const botaoVerMais = playlistDiv.querySelector(".lista-ver");
    configurarBotaoVerMaisPlaylist(
      botaoVerMais,
      generosMix,
      "Recomendados para Você"
    );

    container.prepend(playlistDiv);
  } catch (err) {
    console.error("Erro ao gerar playlist de descobertas:", err);
  }
}

// ------------------------
// GERAR TÍTULOS CRIATIVOS
// ------------------------
function gerarTituloPorGenero(generoId) {
  const nomesGeneros = {
    28: [
      "Ação Sem Limites",
      "Explosões e Emoção",
      "Pura Adrenalina",
      "Missão Imperdível",
    ],
    12: [
      "Aventure-se!",
      "Expedição Extraordinária",
      "Mundo de Aventuras",
      "Jornada Épica",
    ],
    16: [
      "Mundos Animados",
      "Animação Total",
      "Fantasia em Desenho",
      "Diversão Colorida",
    ],
    35: [
      "Risadas Garantidas",
      "Comédia Nacional",
      "Humor de Primeira",
      "Gargalhadas na Sessão",
    ],
    18: [
      "Drama em Cena",
      "Emoções à Flor da Pele",
      "Histórias que Comovem",
      "Dramas Intensos",
    ],
    27: [
      "Noite de Terror",
      "Pesadelos Assustadores",
      "Suspense Mortal",
      "Terror Clássico",
    ],
    10749: [
      "Amor no Ar",
      "Romance Aconchegante",
      "Histórias de Amor",
      "Corações Apaixonados",
    ],
    878: [
      "Futuro e Ficção",
      "Universos Distantes",
      "Ficção Científica",
      "Futurismo Total",
    ],
    99: [
      "Baseado em Fatos",
      "Documentários Incríveis",
      "História Real",
      "Mundo Real",
    ],
    14: [
      "Fantasia e Magia",
      "Reino da Fantasia",
      "Magia Pura",
      "Aventuras Mágicas",
    ],
    36: [
      "Episódios Históricos",
      "Viagem no Tempo",
      "História Viva",
      "Épocas Memoráveis",
    ],
    10402: [
      "Ritmo e Melodia",
      "Musicais Incríveis",
      "Som e Imagem",
      "Palco Musical",
    ],
    9648: [
      "Mistério Total",
      "Casos Indecifráveis",
      "Suspense Mental",
      "Enigmas por Resolver",
    ],
    10752: [
      "Guerra e Coragem",
      "Campo de Batalha",
      "Heroísmo Real",
      "Dramas Bélicos",
    ],
  };

  const opcoes = nomesGeneros[generoId] || ["Recomendado pra Você"];
  return opcoes[Math.floor(Math.random() * opcoes.length)];
}

// ------------------------
// CONFIGURAR BOTÕES "VER MAIS" DAS PLAYLISTS
// ------------------------
function configurarBotaoVerMaisPlaylist(botao, generoId, titulo) {
  botao.addEventListener("click", () => {
    // Salva os dados da playlist no sessionStorage
    sessionStorage.setItem("listaTipo", "playlist");
    sessionStorage.setItem("playlistGenero", generoId);
    sessionStorage.setItem("playlistTitulo", titulo);

    if (typeof window.carregarPagina === "function") {
      window.carregarPagina("paginas/listagem.html", () => {
        if (typeof initListagem === "function") {
          initListagem();
        }
      });
    }
  });
}

// ------------------------
// CONFIGURAR BOTÕES "VER MAIS" DAS PLAYLISTS ESTÁTICAS
// ------------------------
function configurarBotoesVerMaisEstaticos() {
  const botoesVerMais = document.querySelectorAll(".lista-ver");

  botoesVerMais.forEach((botao) => {
    // Só configura se não tiver sido configurado ainda
    if (!botao._configurado) {
      botao._configurado = true;

      botao.addEventListener("click", function (e) {
        e.stopPropagation();

        const lista = this.closest(".lista");
        const titulo = lista.querySelector(".lista-titulo").textContent;

        // Mapear títulos estáticos para categorias da API
        const categorias = {
          "Então é Natal...": {
            tipo: "natal",
            url: `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_keywords=christmas,holiday&sort_by=popularity.desc`,
          },
          "Filmes Populares": {
            tipo: "popular",
            url: `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=pt-BR&page=1`,
          },
          "Nos Cinemas": {
            tipo: "now_playing",
            url: `https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}&language=pt-BR&page=1`,
          },
          Nacionais: {
            tipo: "brasil",
            url: `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_original_language=pt&sort_by=popularity.desc`,
          },
          "Clássicos do Cinema": {
            tipo: "classicos",
            url: `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&sort_by=vote_average.desc&vote_count.gte=1000&primary_release_date.lte=2000-12-31`,
          },
          "Superação e Coragem": {
            tipo: "drama",
            url: `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=18&sort_by=popularity.desc`,
          },
          "Universo Marvel": {
            tipo: "marvel",
            url: `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_companies=420|19551|38679|13252&sort_by=popularity.desc`,
          },
          "Viagem no Tempo": {
            tipo: "time_travel",
            url: `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_keywords=time-travel&sort_by=popularity.desc`,
          },
          "Filmes Bíblicos": {
            tipo: "biblicos",
            url: `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_keywords=bible,biblical&sort_by=popularity.desc`,
          },
          "Filmes de Anime": {
            tipo: "anime",
            url: `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_original_language=ja&sort_by=popularity.desc`,
          },
          "Para não assistir sozinho": {
            tipo: "terror",
            url: `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=27&sort_by=popularity.desc`,
          },
          "O melhor da comédia": {
            tipo: "comedia",
            url: `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=35&sort_by=popularity.desc`,
          },
          "Caiu um cisco no meu olho...": {
            tipo: "drama_emocional",
            url: `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=18&sort_by=vote_average.desc&vote_count.gte=100`,
          },
          "Momento em família": {
            tipo: "familia",
            url: `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=10751&sort_by=popularity.desc`,
          },
          "Além da realidade": {
            tipo: "ficcao",
            url: `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=878&sort_by=popularity.desc`,
          },
        };

        const categoria = categorias[titulo] || categorias["Filmes Populares"];

        // Salvar dados para a listagem
        sessionStorage.setItem("listaTipo", "playlist");
        sessionStorage.setItem("playlistGenero", categoria.tipo);
        sessionStorage.setItem("playlistTitulo", titulo);
        sessionStorage.setItem("playlistUrl", categoria.url);

        // Navegar para a página de listagem
        if (typeof window.carregarPagina === "function") {
          window.carregarPagina("paginas/listagem.html", () => {
            if (typeof initListagem === "function") {
              initListagem();
            }
          });
        }
      });
    }
  });
}
// ------------------------
// INIT PESQUISA - VERSÃO CORRIGIDA
// ------------------------
function initPesquisa() {
  const apiKey = "e293e84786f06c94bf36414cc9240da4";
  const inputPesquisa = document.getElementById("pesquisa");
  const divBusca = document.getElementById("busca");
  const divPesquisados = document.querySelector(".pesquisados-recentemente");

  if (!inputPesquisa || !divBusca || !divPesquisados) return;

  // Carregar histórico do localStorage
  let historicoPesquisas = JSON.parse(
    localStorage.getItem("historicoPesquisas") || "[]"
  );

  // Atualizar display do histórico
  function atualizarHistoricoDisplay() {
    divPesquisados.innerHTML = "";

    if (historicoPesquisas.length === 0) {
      divPesquisados.style.display = "none";
      return;
    }

    divPesquisados.style.display = "flex";

    // Mostrar apenas as últimas 5 pesquisas
    const ultimasPesquisas = historicoPesquisas.slice(-5);

    ultimasPesquisas.forEach((termo) => {
      const item = document.createElement("div");
      item.classList.add("pesquisados-item");
      item.innerHTML = `
        <label class="pesquisados-texto">${termo}</label>
        <div class="toolbar-pesquisa-icone-cancelar limpar-item-pesquisados"></div>
      `;

      // Clique no ITEM INTEIRO - pesquisa novamente
      item.addEventListener("click", (e) => {
        // Só pesquisa se não clicou no X
        if (!e.target.classList.contains("limpar-item-pesquisados")) {
          inputPesquisa.value = termo;
          searchMovies(termo);
          divPesquisados.style.display = "none";
        }
      });

      // Clique no X - remove do histórico
      item
        .querySelector(".limpar-item-pesquisados")
        .addEventListener("click", (e) => {
          e.stopPropagation(); // Impede o clique no item
          removerDoHistorico(termo);
        });

      divPesquisados.appendChild(item);
    });
  }

  // Adicionar ao histórico (APENAS quando terminar de digitar)
  function adicionarAoHistorico(termo) {
    if (!termo.trim()) return;

    // Remove se já existir (para evitar duplicatas)
    historicoPesquisas = historicoPesquisas.filter((item) => item !== termo);

    // Adiciona no final
    historicoPesquisas.push(termo);

    // Mantém apenas os últimos 10 itens
    if (historicoPesquisas.length > 10) {
      historicoPesquisas = historicoPesquisas.slice(-10);
    }

    localStorage.setItem(
      "historicoPesquisas",
      JSON.stringify(historicoPesquisas)
    );
    atualizarHistoricoDisplay();
  }

  // Remover do histórico
  function removerDoHistorico(termo) {
    historicoPesquisas = historicoPesquisas.filter((item) => item !== termo);
    localStorage.setItem(
      "historicoPesquisas",
      JSON.stringify(historicoPesquisas)
    );
    atualizarHistoricoDisplay();
  }

  // Botão limpar pesquisa
  document.getElementById("limpar-pesquisa").addEventListener("click", () => {
    inputPesquisa.value = "";
    sessionStorage.removeItem("ultimaPesquisa");
    divBusca.innerHTML = "";
    divBusca.style.display = "none"; // ← ESCONDE a div de busca
    divPesquisados.style.display = "flex";
    clearTimeout(debounceTimer);
    atualizarHistoricoDisplay();
  });

  // Restaurar pesquisa salva
  const pesquisaSalva = sessionStorage.getItem("ultimaPesquisa");
  if (pesquisaSalva) {
    inputPesquisa.value = pesquisaSalva;
    divPesquisados.style.display = "none"; // ← ESCONDE histórico imediatamente
    divBusca.style.display = "flex"; // ← MOSTRA busca imediatamente
    searchMovies(pesquisaSalva);
  } else {
    divBusca.style.display = "none"; // ← Garante que busca está escondida
    atualizarHistoricoDisplay();
  }

  // Função de busca
  async function searchMovies(query) {
    if (!query && inputPesquisa.value === "") {
      divBusca.innerHTML = "";
      divBusca.style.display = "none";
      sessionStorage.removeItem("ultimaPesquisa");
      divPesquisados.style.display = "flex";
      atualizarHistoricoDisplay();
      return;
    }

    if (!query) {
      divBusca.innerHTML = "";
      divBusca.style.display = "none";
      sessionStorage.removeItem("ultimaPesquisa");
      divPesquisados.style.display = "flex";
      atualizarHistoricoDisplay();
      return;
    }

    sessionStorage.setItem("ultimaPesquisa", query);
    divPesquisados.style.display = "none";
    divBusca.style.display = "flex";

    const url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(
      query
    )}&language=pt-BR`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      displayResults(data.results);
    } catch (error) {
      console.error("Erro na busca:", error);
    }
  }

  // Detalhes extras
  async function getContentDetails(id, type) {
    const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=pt-BR&append_to_response=external_ids`;
    const response = await fetch(url);
    return await response.json();
  }

  // Monta cards
  async function displayResults(results) {
    divBusca.innerHTML = "";
    divBusca.style.display = "flex";
    const query = inputPesquisa.value.trim().toLowerCase();
    const seen = new Set();

    for (const result of results) {
      if (!result.poster_path) continue;
      const title = (result.title || result.name || "").trim();
      if (!title.toLowerCase().startsWith(query)) continue;

      const type = result.media_type === "tv" ? "tv" : "movie";
      const details = await getContentDetails(result.id, type);

      const contentId =
        type === "movie"
          ? details.external_ids.imdb_id || details.id
          : details.id;

      if (!contentId || seen.has(contentId)) continue;
      seen.add(contentId);

      const capaUrl = `https://images.weserv.nl/?url=image.tmdb.org/t/p/w500${result.poster_path}`;
      const generos =
        (details.genres || []).map((g) => g.name).join(", ") || "—";
      const nota = details.vote_average?.toFixed(1) || "—";
      const duracao =
        type === "movie"
          ? details.runtime
            ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}min`
            : "—"
          : details.episode_run_time?.[0]
          ? `${Math.floor(details.episode_run_time[0] / 60)}h ${
              details.episode_run_time[0] % 60
            }min`
          : "—";
      const ano = (details.release_date || details.first_air_date || "").slice(
        0,
        4
      );
      const sinopse = details.overview || "Sem sinopse disponível no momento.";

      const wrapper = document.createElement("div");
      wrapper.classList.add("busca-obra");

      const capa = document.createElement("div");
      capa.classList.add("busca-obra-capa");
      capa.style.backgroundImage = `url('${capaUrl}')`;

      // ColorThief
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = capaUrl;
      img.onload = () => {
        try {
          const colorThief = new ColorThief();
          const [r, g, b] = colorThief.getColor(img);
          capa.style.boxShadow = `0px 4px 20px rgba(${r}, ${g}, ${b}, 0.2)`;
        } catch {
          capa.style.boxShadow = "0px 4px 20px rgba(0, 0, 0, 0.1)";
        }
      };

      const infoHTML = `
        <div class="busca-obra-informacoes">
          <label class="busca-obra-nome">${title}</label>
          <label class="busca-obra-genero">${generos}</label>
          <div class="busca-obra-review">
            <div class="busca-obra-review-item">
              <div class="busca-obra-icone-estrela"></div>
              <label class="review-texto">${nota}</label>
            </div>
            <label class="review-texto">•</label>
            <div class="busca-obra-review-item">
              <div class="busca-obra-icone-duracao"></div>
              <label class="review-texto">${duracao}</label>
            </div>
            <label class="review-texto">•</label>
            <div class="busca-obra-review-item">
              <label class="review-texto">${ano}</label>
            </div>
          </div>
          <label class="busca-obra-sinopse">${sinopse}</label>
        </div>
      `;

      wrapper.appendChild(capa);
      wrapper.insertAdjacentHTML("beforeend", infoHTML);
      wrapper.dataset.obraId = contentId;
      wrapper.dataset.tipo = type;

      // Clique SPA usando carregarPagina
      wrapper.addEventListener("click", () => {
        const navbar = document.querySelector(".navbar");
        if (navbar) navbar.classList.add("navbar-esconde");
        if (typeof window.carregarPagina === "function") {
          window.carregarPagina("paginas/assistir.html", () => {
            if (typeof initAssistir === "function") {
              initAssistir(wrapper.dataset.obraId, wrapper.dataset.tipo);
            }
          });
        }
      });

      divBusca.appendChild(wrapper);
    }
  }

  // Evento input com debounce - CORRIGIDO: só salva no histórico quando terminar de digitar
  let debounceTimer;
  let ultimaPesquisaSalva = "";

  inputPesquisa.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = inputPesquisa.value.trim();

      // Só salva no histórico se for diferente da última pesquisa salva
      // e se o usuário parou de digitar (query não está vazia)
      if (query && query !== ultimaPesquisaSalva) {
        adicionarAoHistorico(query);
        ultimaPesquisaSalva = query;
      }

      searchMovies(query);
    }, 800); // Aumentei para 800ms para garantir que terminou de digitar
  });

  // Evento quando o input perde o foco (usuário terminou de digitar)
  inputPesquisa.addEventListener("blur", () => {
    const query = inputPesquisa.value.trim();
    if (query && query !== ultimaPesquisaSalva) {
      adicionarAoHistorico(query);
      ultimaPesquisaSalva = query;
    }
  });
}

async function initAssistir(obraIdParam, tipoParam) {
  const obraId =
    obraIdParam || new URLSearchParams(window.location.search).get("obra_id");
  const tipo =
    tipoParam ||
    new URLSearchParams(window.location.search).get("tipo") ||
    "movie";

  const apiKey = "e293e84786f06c94bf36414cc9240da4";

  const botaoAssistir = document.getElementById("botao-assistir");
  const dropdown = document.getElementById("dropdown-servidores");
  const botoesServidor = document.querySelectorAll(".assistir-botao-servidor");

  // Abrir/fechar dropdown
  botaoAssistir.addEventListener("click", function (e) {
    e.stopPropagation();

    const estaAbrindo = !dropdown.classList.contains("mostrar");

    dropdown.classList.toggle("mostrar");

    if (estaAbrindo) {
      // Se estiver abrindo, adiciona a classe sem delay
      botaoAssistir.classList.add("ativo");
    } else {
      // Se estiver fechando, remove a classe com delay
      setTimeout(() => {
        botaoAssistir.classList.remove("ativo");
      }, 400);
    }
  });

  // Fechar dropdown ao clicar em um servidor
  botoesServidor.forEach((botao) => {
    botao.addEventListener("click", function () {
      const servidor = this.getAttribute("data-servidor");

      // Remove a classe ativo de todos os botões
      botoesServidor.forEach((btn) => btn.classList.remove("ativo"));
      // Adiciona a classe ativo ao botão clicado
      this.classList.add("ativo");

      // Primeiro remove o dropdown
      dropdown.classList.remove("mostrar");

      // Depois de 0.4 segundos remove a classe do botão assistir
      setTimeout(() => {
        botaoAssistir.classList.remove("ativo");
      }, 400);
    });
  });

  async function getDetails(id, type) {
    const res = await fetch(
      `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=pt-BR`
    );
    return await res.json();
  }

  const detalhes = await getDetails(obraId, tipo);

  // Aplica a imagem de capa com desfoque no slide-in usando ::before
  const slideIn = document.querySelector(".slide-in");
  if (slideIn) {
    // Busca imagens do filme/série
    const imgRes = await fetch(
      `https://api.themoviedb.org/3/${tipo}/${obraId}/images?api_key=${apiKey}`
    );
    const imgData = await imgRes.json();
    const backdrop = imgData.backdrops?.[0]?.file_path || detalhes.poster_path;
    if (backdrop) {
      const imageUrl = `https://image.tmdb.org/t/p/original${backdrop}`;

      // Cria o estilo para o ::before
      const style = document.createElement("style");
      style.id = "slide-in-background-style"; // Adiciona um ID único
      style.textContent = `
        .tela-assistir::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(9, 16, 38, 0.8);
            z-index: 0;
            background-image: url('${imageUrl}');
            background-size: cover;
            background-position: center;
            filter: blur(100px);
            transform: scale(1.2);
            opacity: 0;
            animation: fadeInBackground 1.5s ease 2s forwards;
        }
        
        .tela-assistir > * {
            position: relative;
            z-index: 1;
        }
        
        @keyframes fadeInBackground {
            from {
                opacity: 0;
            }
            to {
                opacity: 0.3;
            }
        }
    `;
      document.head.appendChild(style);
    }
  }

  const capaDiv = document.getElementById("assistir-obra-capa");
  if (capaDiv) {
    // Busca imagens do filme/série
    const imgRes = await fetch(
      `https://api.themoviedb.org/3/${tipo}/${obraId}/images?api_key=${apiKey}`
    );
    const imgData = await imgRes.json();

    // Usa o primeiro backdrop disponível (ou fallback pro poster)
    const backdrop = imgData.backdrops?.[0]?.file_path || detalhes.poster_path;
    if (backdrop) {
      capaDiv.style.backgroundImage = `url('https://image.tmdb.org/t/p/original${backdrop}')`;
    }
  }

  document.getElementById("assistir-obra-titulo").textContent =
    detalhes.title || detalhes.name || "—";
  document.getElementById("assistir-obra-genero").textContent =
    (detalhes.genres || []).map((g) => g.name).join(", ") || "—";
  document.getElementById("assistir-obra-sinopse").textContent =
    detalhes.overview || "Sem sinopse disponível no momento.";
  document.getElementById("ano-lancamento").textContent = (
    detalhes.release_date ||
    detalhes.first_air_date ||
    ""
  ).slice(0, 4);
  document.getElementById("avaliacao").textContent =
    detalhes.vote_average?.toFixed(1) || "—";
  document.getElementById("duracao").textContent =
    tipo === "movie"
      ? detalhes.runtime
        ? `${Math.floor(detalhes.runtime / 60)}h ${detalhes.runtime % 60}min`
        : "—"
      : detalhes.episode_run_time?.[0]
      ? `${Math.floor(detalhes.episode_run_time[0] / 60)}h ${
          detalhes.episode_run_time[0] % 60
        }min`
      : "—";
  let classificacao = "+";

  if (tipo === "movie") {
    const resClass = await fetch(
      `https://api.themoviedb.org/3/movie/${obraId}/release_dates?api_key=${apiKey}`
    );
    const dataClass = await resClass.json();
    const brClass = dataClass.results.find((r) => r.iso_3166_1 === "BR");
    if (brClass && brClass.release_dates.length > 0) {
      classificacao = brClass.release_dates[0].certification || "+";
    }
  } else {
    const resClass = await fetch(
      `https://api.themoviedb.org/3/tv/${obraId}/content_ratings?api_key=${apiKey}`
    );
    const dataClass = await resClass.json();
    const brClass = dataClass.results.find((r) => r.iso_3166_1 === "BR");
    if (brClass) {
      classificacao = brClass.rating || "+";
    }
  }

  document.getElementById("classificacao").textContent = classificacao;

  const userId = localStorage.getItem("usuario_id");
  const curtirBtn = document.getElementById("assistir-obra-curtir");

  // -----------------------------
  // 🔹 MARCAR COMO ASSISTIDO
  // -----------------------------
  const assistidoBtn = document.getElementById("assistir-botao-assistido");

  if (assistidoBtn && userId && obraId) {
    try {
      // Verifica se já foi assistido
      const { data: watched, error: fetchError } = await window.supabase
        .from("watched_works")
        .select("*")
        .eq("user_id", userId)
        .eq("work_id", obraId)
        .maybeSingle();

      if (!fetchError && watched) {
        assistidoBtn.style.backgroundImage = "url('imagens/olhoaberto.png')";
      }

      // Clique para marcar/desmarcar
      assistidoBtn.addEventListener("click", async () => {
        const { data: existing, error: checkError } = await window.supabase
          .from("watched_works")
          .select("*")
          .eq("user_id", userId)
          .eq("work_id", obraId)
          .maybeSingle();

        if (checkError && checkError.code !== "PGRST116") throw checkError;

        if (existing) {
          // Desmarcar
          const { error: delError } = await window.supabase
            .from("watched_works")
            .delete()
            .eq("user_id", userId)
            .eq("work_id", obraId);

          if (delError) throw delError;
          assistidoBtn.style.backgroundImage = "url('imagens/olhofechado.png')";
        } else {
          // Marcar como assistido
          const { error: insertError } = await window.supabase
            .from("watched_works")
            .insert([{ user_id: userId, work_id: obraId }]);

          if (insertError) throw insertError;
          assistidoBtn.style.backgroundImage = "url('imagens/olhoaberto.png')";
        }
      });
    } catch (err) {
      console.error("Erro ao lidar com watched_works:", err);
    }
  }

  // 🔹 Verifica se já curtiu ao carregar
  if (curtirBtn && userId && obraId) {
    try {
      const { data: likedWorks, error: fetchError } = await window.supabase
        .from("liked_works")
        .select("*")
        .eq("user_id", userId)
        .eq("work_id", obraId)
        .maybeSingle();

      if (!fetchError && likedWorks) {
        curtirBtn.classList.add("active");
      }
    } catch (err) {
      console.error("Erro ao verificar liked_works:", err);
    }

    // 🔹 Curtir / descurtir
    curtirBtn.addEventListener("click", async () => {
      try {
        const { data: likedWorks, error: fetchError } = await window.supabase
          .from("liked_works")
          .select("*")
          .eq("user_id", userId)
          .eq("work_id", obraId)
          .maybeSingle();

        if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

        if (likedWorks) {
          const { error: delError } = await window.window.supabase
            .from("liked_works")
            .delete()
            .eq("user_id", userId)
            .eq("work_id", obraId);
          if (delError) throw delError;
          curtirBtn.classList.remove("active");
        } else {
          const { error: insertError } = await window.supabase
            .from("liked_works")
            .insert([{ user_id: userId, work_id: obraId }]);
          if (insertError) throw insertError;
          curtirBtn.classList.add("active");
        }
      } catch (err) {
        console.error("Erro ao curtir/descurtir obra:", err);
      }
    });
  }

  document
    .getElementById("assistir-botao-voltar")
    .addEventListener("click", () => {
      if (typeof window.voltarPagina === "function") {
        window.voltarPagina();
      }
      const navbar = document.querySelector(".navbar");
      if (navbar) navbar.classList.remove("navbar-esconde");

      // Remove o estilo do background 0.5 segundos depois
      setTimeout(() => {
        const styleElement = document.getElementById(
          "slide-in-background-style"
        );
        if (styleElement) {
          styleElement.remove();
        }
      }, 500);
    });
  // ------------------------
  // SERVIDORES COM IFRAME
  // ------------------------
  const servidores = [
    {
      movie: `https://embed.warezcdn.link/filme/${obraId}`,
      tv: `https://embed.warezcdn.link/serie/${obraId}`,
    },
    {
      movie: `https://embed.embedplayer.site/${obraId}`,
      tv: `https://embed.embedplayer.site/serie/${obraId}`,
    },
    {
      movie: `https://superflixapi.asia/filme/${obraId}`,
      tv: `https://superflixapi.asia/serie/${obraId}`,
    },
    {
      movie: `https://assistirseriesonline.icu/filme/${obraId}/`,
      tv: `https://assistirseriesonline.icu/embed/${obraId}/`,
    },
    {
      movie: `https://playerflixapi.com/filme/${obraId}/`,
      tv: `https://playerflixapi.com/serie/${obraId}/1/1`,
    },
    {
      movie: `https://player.autoembed.cc/embed/movie/${obraId}/`,
      tv: `https://player.autoembed.cc/embed/tv/${obraId}/`,
    },
    {
      movie: `https://hexa.watch/watch/movie/${detalhes.id}/`,
      tv: `https://hexa.watch/watch/tv/${obraId}/1/1/`,
    },
    {
      movie: `https://moviesapi.club/movie/${obraId}/`,
      tv: `https://moviesapi.club/tv/${obraId}`,
    },
  ];

  // Fechar dropdown e carregar servidor ao clicar em um botão
  botoesServidor.forEach((botao, index) => {
    botao.addEventListener("click", function () {
      const servidor = this.getAttribute("data-servidor");

      // Remove a classe ativo de todos os botões
      botoesServidor.forEach((btn) => btn.classList.remove("ativo"));
      // Adiciona a classe ativo ao botão clicado
      this.classList.add("ativo");

      // Carrega o iframe do servidor selecionado
      const urlObj = servidores[index];
      if (urlObj) {
        const elementoAtual =
          document.getElementById("assistir-obra-capa") ||
          document.getElementById("player");
        if (!elementoAtual) return;

        const iframe = document.createElement("iframe");
        iframe.id = "player";
        iframe.src = urlObj[tipo];
        iframe.classList.add("assistir-obra-player");
        iframe.allowFullscreen = true;
        iframe.scrolling = "no";
        iframe.frameBorder = "0";
        elementoAtual.replaceWith(iframe);
      }

      // Primeiro remove o dropdown
      dropdown.classList.remove("mostrar");

      // Depois de 0.4 segundos remove a classe do botão assistir
      setTimeout(() => {
        botaoAssistir.classList.remove("ativo");
      }, 400);
    });
  });

  // ------------------------
  // TRAILER YOUTUBE COM FADE-IN
  // ------------------------
  async function fetchTrailer(id, type) {
    try {
      const videoResponse = await fetch(
        `https://api.themoviedb.org/3/${type}/${id}/videos?api_key=${apiKey}`
      );
      const videoData = await videoResponse.json();
      const trailer = videoData.results.find(
        (v) => v.type === "Trailer" && v.site === "YouTube"
      );
      if (!trailer) return;

      setTimeout(() => {
        const capaDiv = document.getElementById("assistir-obra-capa");
        if (!capaDiv) return;

        const wrapper = document.createElement("div");
        wrapper.id = "div-preview-trailer";

        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0`;
        iframe.allow = "autoplay; encrypted-media";
        iframe.allowFullscreen = true;
        iframe.id = "iframe-assistir";

        wrapper.appendChild(iframe);

        capaDiv.style.transition = "opacity 1.5s ease";
        capaDiv.style.opacity = "0";

        setTimeout(() => {
          capaDiv.replaceWith(wrapper);
          requestAnimationFrame(() => {
            wrapper.style.opacity = "1";
            iframe.style.opacity = "1";
          });
        }, 300);
      }, 30000);
    } catch (err) {
      console.error("Erro ao buscar trailer:", err);
    }
  }

  // ------------------------
  // ELENCO PRINCIPAL
  // ------------------------
  async function fetchElenco(id, type) {
    try {
      const elencoRes = await fetch(
        `https://api.themoviedb.org/3/${type}/${id}/credits?api_key=${apiKey}&language=pt-BR`
      );
      const elencoData = await elencoRes.json();
      const elencoDiv = document.getElementById("assistir-elenco");
      if (!elencoDiv) return;

      elencoDiv.innerHTML = ""; // limpa o conteúdo anterior

      const principais = elencoData.cast.slice(0, 10); // mostra até 10 pessoas

      if (principais.length === 0) {
        elencoDiv.innerHTML =
          '<p style="color: #ccc; font-size: 0.9rem;">Elenco não disponível</p>';
        return;
      }

      principais.forEach((ator) => {
        const pessoa = document.createElement("div");
        pessoa.classList.add("elenco-pessoa");

        const foto = document.createElement("div");
        foto.classList.add("pessoa-foto");
        foto.style.backgroundImage = ator.profile_path
          ? `url('https://image.tmdb.org/t/p/w185${ator.profile_path}')`
          : "url('imagens/semfoto.png')";

        const info = document.createElement("div");
        info.classList.add("pessoa-informacoes");

        const nome = document.createElement("label");
        nome.classList.add("pessoa-nome");
        nome.textContent = ator.name || "Nome não disponível";

        const personagem = document.createElement("label");
        personagem.classList.add("pessoa-personagem");
        personagem.textContent =
          ator.character || "Personagem não especificado";

        info.appendChild(nome);
        info.appendChild(personagem);
        pessoa.appendChild(foto);
        pessoa.appendChild(info);
        elencoDiv.appendChild(pessoa);
      });
    } catch (err) {
      console.error("Erro ao buscar elenco:", err);
      const elencoDiv = document.getElementById("assistir-elenco");
      if (elencoDiv) {
        elencoDiv.innerHTML =
          '<p style="color: #ccc; font-size: 0.9rem;">Erro ao carregar elenco</p>';
      }
    }
  }

  fetchTrailer(obraId, tipo);
  fetchElenco(obraId, tipo);
}

// ------------------------
// INIT PERFIL
// ------------------------
async function initPerfil() {
  const userId = localStorage.getItem("usuario_id");
  if (!userId) return;

  const botaoSair = document.getElementById("perfil-botao-sair");

  botaoSair.addEventListener("click", () => {
    abrirPopup("Deseja mesmo sair da sua conta?", () => {
      localStorage.clear();
      window.location.href = "logincadastro.html";
    });
  });

  // Nome e foto do usuário
  document.querySelector(".perfil-texto-nome").textContent =
    localStorage.getItem("usuario_nome");

  const fotoPerfil = localStorage.getItem("usuario_foto");
  const perfilFotoDiv = document.querySelector(".perfil-foto");
  perfilFotoDiv.style.backgroundImage =
    fotoPerfil && fotoPerfil.trim() !== ""
      ? `url(${fotoPerfil})`
      : "url('imagens/semfoto.png')";

  const apiKey = "e293e84786f06c94bf36414cc9240da4";

  try {
    // -----------------------
    // CURTIDAS E ASSISTIDOS
    // -----------------------
    const { data: likedWorks, error: likedError } = await window.supabase
      .from("liked_works")
      .select("work_id")
      .eq("user_id", userId);
    if (likedError) throw likedError;

    const { data: watchedWorks, error: watchedError } = await window.supabase
      .from("watched_works")
      .select("work_id")
      .eq("user_id", userId);
    if (watchedError) throw watchedError;

    // -----------------------
    // ESTATÍSTICAS
    // -----------------------
    const curtidasNum = likedWorks.length.toString().padStart(2, "0");
    const assistidosNum = watchedWorks.length.toString().padStart(2, "0");

    document.getElementById("curtidas").textContent = curtidasNum;
    document.getElementById("assistidos").textContent = assistidosNum;

    // -----------------------
    // IMAGENS E CARDS
    // -----------------------
    async function buscarImagemObra(workId, tipo, usarIngles = false) {
      const res = await fetch(
        `https://api.themoviedb.org/3/${tipo}/${workId}/images?api_key=${apiKey}`
      );
      const data = await res.json();
      if (!data || !data.backdrops?.length) return null;

      const imgs = data.backdrops.filter((img) => img.width > img.height);

      const prioridade = {
        "pt-BR": 1,
        "pt-PT": 2,
        pt: 3,
        null: 4,
        undefined: 4,
      };
      if (usarIngles) prioridade["en-US"] = 3;

      imgs.sort((a, b) => {
        const pa = prioridade[a.iso_639_1] || 9;
        const pb = prioridade[b.iso_639_1] || 9;
        if (pa !== pb) return pa - pb;
        return (b.vote_average || 0) - (a.vote_average || 0);
      });

      const melhor = imgs[0];
      return melhor
        ? `https://image.tmdb.org/t/p/original${melhor.file_path}`
        : null;
    }

    async function criarCardObra(workId, container) {
      let tipo = "movie";
      let res = await fetch(
        `https://api.themoviedb.org/3/movie/${workId}?api_key=${apiKey}&language=pt-BR`
      );
      let detalhes = await res.json();

      if (detalhes.status_code === 34) {
        tipo = "tv";
        res = await fetch(
          `https://api.themoviedb.org/3/tv/${workId}?api_key=${apiKey}&language=pt-BR`
        );
        detalhes = await res.json();
      }

      const capaUrl =
        (await buscarImagemObra(workId, tipo)) ||
        (detalhes.poster_path
          ? `https://image.tmdb.org/t/p/w500${detalhes.poster_path}`
          : "imagens/semfoto.png");

      const nome = detalhes.title || detalhes.name || "Título desconhecido";

      const obraDiv = document.createElement("div");
      obraDiv.classList.add("obra");

      const capaDiv = document.createElement("div");
      capaDiv.classList.add("obra-capa");
      capaDiv.style.backgroundImage = `url('${capaUrl}')`;

      const nomeLabel = document.createElement("label");
      nomeLabel.classList.add("obra-nome");
      nomeLabel.textContent = nome;

      obraDiv.appendChild(capaDiv);
      obraDiv.appendChild(nomeLabel);

      obraDiv.dataset.obraId = workId;
      obraDiv.dataset.tipo = tipo;

      // Clique → tela assistir
      obraDiv.addEventListener("click", () => {
        const navbar = document.querySelector(".navbar");
        if (navbar) navbar.classList.add("navbar-esconde");
        if (typeof window.carregarPagina === "function") {
          window.carregarPagina("paginas/assistir.html", () => {
            if (typeof initAssistir === "function") {
              initAssistir(workId, tipo);
            }
          });
        }
      });

      container.appendChild(obraDiv);
      return detalhes;
    }

    // -----------------------
    // CONFIGURAR BOTÕES "VER TUDO"
    // -----------------------
    // No initPerfil, atualize a função configurarBotaoVerTudo:
    function configurarBotaoVerTudo(seletor, tipoLista, works) {
      const botaoVerTudo = document.querySelector(seletor);
      if (botaoVerTudo && works.length > 10) {
        botaoVerTudo.style.display = "block";
        botaoVerTudo.addEventListener("click", () => {
          // Salva os dados da lista no sessionStorage para usar na listagem.html
          sessionStorage.setItem("listaTipo", tipoLista);
          sessionStorage.setItem("listaWorks", JSON.stringify(works));

          if (typeof window.carregarPagina === "function") {
            window.carregarPagina("paginas/listagem.html", () => {
              if (typeof initListagem === "function") {
                initListagem();
              }
            });
          }
        });
      } else if (botaoVerTudo) {
        botaoVerTudo.style.display = "none";
      }
    }

    // -----------------------
    // LISTA DE CURTIDAS (máximo 10)
    // -----------------------
    const listaCurtidasDiv = document
      .getElementById("lista-curtidas")
      .querySelector(".lista-obras");
    listaCurtidasDiv.innerHTML = "";

    if (likedWorks.length === 0) {
      listaCurtidasDiv.innerHTML =
        '<label style="color: #999; text-align: center;">Nenhuma obra curtida ainda</label>';
    } else {
      // Pega apenas os primeiros 10 itens
      const curtidasParaMostrar = likedWorks.slice(0, 10);

      for (const work of curtidasParaMostrar) {
        await criarCardObra(work.work_id, listaCurtidasDiv);
      }
    }

    // Configura botão "Ver tudo" para curtidas
    configurarBotaoVerTudo(
      "#lista-curtidas .lista-ver",
      "curtidas",
      likedWorks
    );

    // -----------------------
    // LISTA DE ASSISTIDOS + ESSÊNCIA (máximo 10)
    // -----------------------
    const listaAssistidosDiv = document
      .getElementById("lista-assistidos")
      .querySelector(".lista-obras");
    listaAssistidosDiv.innerHTML = "";

    const perfilEssencia = document.querySelector(".perfil-essencia");

    if (watchedWorks.length === 0) {
      listaAssistidosDiv.innerHTML =
        '<label style="color: #999; text-align: center;">Nenhuma obra assistida ainda</label>';
      perfilEssencia.style.backgroundImage =
        "url('./imagens/essencia-vazia.png')";
      perfilEssencia.style.boxShadow = "0 0 50px 10px rgba(34, 47, 77, 0.3)";
    } else {
      // Pega apenas os primeiros 10 itens para exibição
      const assistidosParaMostrar = watchedWorks.slice(0, 10);
      let generos = {};

      for (const work of assistidosParaMostrar) {
        const detalhes = await criarCardObra(work.work_id, listaAssistidosDiv);
        if (detalhes && detalhes.genres) {
          detalhes.genres.forEach((g) => {
            generos[g.name] = (generos[g.name] || 0) + 1;
          });
        }
      }

      // Configura botão "Ver tudo" para assistidos
      configurarBotaoVerTudo(
        "#lista-assistidos .lista-ver",
        "assistidos",
        watchedWorks
      );

      // Cálculo da essência (usa TODOS os assistidos, não apenas os 10 mostrados)
      if (watchedWorks.length < 10) {
        perfilEssencia.style.backgroundImage =
          "url('./imagens/essencia-vazia.png')";
        perfilEssencia.style.boxShadow = "0 0 50px 10px rgba(34, 47, 77, 0.3)";
      } else {
        // Recalcula gêneros com TODOS os assistidos para a essência
        let todosGeneros = {};
        for (const work of watchedWorks) {
          let tipo = "movie";
          let res = await fetch(
            `https://api.themoviedb.org/3/movie/${work.work_id}?api_key=${apiKey}&language=pt-BR`
          );
          let detalhes = await res.json();

          if (detalhes.status_code === 34) {
            tipo = "tv";
            res = await fetch(
              `https://api.themoviedb.org/3/tv/${work.work_id}?api_key=${apiKey}&language=pt-BR`
            );
            detalhes = await res.json();
          }

          if (detalhes && detalhes.genres) {
            detalhes.genres.forEach((g) => {
              todosGeneros[g.name] = (todosGeneros[g.name] || 0) + 1;
            });
          }
        }

        // Agrupa os gêneros principais por categoria
        const grupos = {
          destemido: ["Ação", "Aventura", "Suspense"],
          sonhador: ["Fantasia", "Ficção Científica"],
          romantico: ["Romance", "Drama"],
          palhaco: ["Comédia", "Animação"],
          sombrio: ["Terror", "Mistério"],
          historiador: ["Guerra", "História"],
          cineasta: ["Clássico", "Arte"],
          analitico: ["Documentário", "Biografia"],
        };

        let pontuacoes = {};
        for (const [categoria, lista] of Object.entries(grupos)) {
          pontuacoes[categoria] = lista.reduce(
            (acc, gen) => acc + (todosGeneros[gen] || 0),
            0
          );
        }

        // Escolhe o grupo mais assistido
        const mais = Object.entries(pontuacoes).sort((a, b) => b[1] - a[1])[0];
        const visuais = {
          destemido: {
            img: "imagens/essencia-destemido.png", // Remove o "www/"
            sombra: "rgba(231, 156, 71, 0.3)",
          },
          sonhador: {
            img: "imagens/essencia-sonhador.png",
            sombra: "rgba(34, 24, 68,0.3)",
          },
          romantico: {
            img: "imagens/essencia-romantico.png",
            sombra: "rgba(236, 194, 199,0.3)",
          },
          palhaco: {
            img: "imagens/essencia-palhaco.png",
            sombra: "rgba(219, 179, 8,0.3)",
          },
          sombrio: {
            img: "imagens/essencia-sombrio.png",
            sombra: "rgba(79, 109, 112,0.3)",
          },
          historiador: {
            img: "imagens/essencia-historiador.png",
            sombra: "rgba(66, 77, 63,0.3)",
          },
          cineasta: {
            img: "imagens/essencia-cineasta.png",
            sombra: "rgba(233, 232, 237,0.3)",
          },
          analitico: {
            img: "imagens/essencia-analitico.png",
            sombra: "rgba(125, 181, 172,0.3)",
          },
        };

        const escolhido = visuais[mais?.[0]] || visuais.destemido;
        perfilEssencia.style.backgroundImage = `url('./${escolhido.img}')`;
        perfilEssencia.style.boxShadow = `0 0 50px 10px ${escolhido.sombra}`;
      }
    }
  } catch (err) {
    console.error("Erro ao carregar perfil:", err);
  }
}

// ------------------------
// INIT LISTAGEM
// ------------------------
async function initListagem() {
  const apiKey = "e293e84786f06c94bf36414cc9240da4";
  const listagemConteudo = document.getElementById("listagem-conteudo");
  const botaoVoltar = document.getElementById("listagem-botao-voltar");

  if (!listagemConteudo) return;

  // Botão voltar
  botaoVoltar.addEventListener("click", () => {
    if (typeof window.voltarPagina === "function") {
      window.voltarPagina();
    }
  });

  // Pegar dados do sessionStorage
  const listaTipo = sessionStorage.getItem("listaTipo");
  const listaWorks = JSON.parse(sessionStorage.getItem("listaWorks") || "[]");
  const playlistGenero = sessionStorage.getItem("playlistGenero");
  const playlistTitulo = sessionStorage.getItem("playlistTitulo");

  if (!listaTipo) {
    listagemConteudo.innerHTML =
      '<label style="color: #999; text-align: center;">Nenhuma obra encontrada</label>';
    return;
  }

  // Título da página baseado no tipo - ATUALIZADO
  const titulos = {
    curtidas: "Obras Curtidas",
    assistidos: "Obras Assistidas",
    playlist: playlistTitulo || "Playlist",
  };

  const tituloLabel = document.querySelector(".listagem-cabecalho label");
  if (tituloLabel) {
    tituloLabel.textContent = titulos[listaTipo] || "Lista de Obras";
  }

  // Limpar conteúdo
  listagemConteudo.innerHTML = "";

  // Função para buscar detalhes da obra
  async function getContentDetails(id, type) {
    const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=pt-BR&append_to_response=external_ids`;
    const response = await fetch(url);
    return await response.json();
  }

  // Função para criar cards (igual à pesquisa)
  async function criarCardObra(workId) {
    let tipo = "movie";
    let detalhes = await getContentDetails(workId, "movie");

    // Se não for filme, tenta como série
    if (detalhes.status_code === 34) {
      tipo = "tv";
      detalhes = await getContentDetails(workId, "tv");
    }

    if (!detalhes || detalhes.status_code === 34) return null;

    const title = (detalhes.title || detalhes.name || "").trim();
    if (!title) return null;

    const capaUrl = detalhes.poster_path
      ? `https://images.weserv.nl/?url=image.tmdb.org/t/p/w500${detalhes.poster_path}`
      : "imagens/semfoto.png";

    const generos =
      (detalhes.genres || []).map((g) => g.name).join(", ") || "—";
    const nota = detalhes.vote_average?.toFixed(1) || "—";
    const duracao =
      tipo === "movie"
        ? detalhes.runtime
          ? `${Math.floor(detalhes.runtime / 60)}h ${detalhes.runtime % 60}min`
          : "—"
        : detalhes.episode_run_time?.[0]
        ? `${Math.floor(detalhes.episode_run_time[0] / 60)}h ${
            detalhes.episode_run_time[0] % 60
          }min`
        : "—";
    const ano = (detalhes.release_date || detalhes.first_air_date || "").slice(
      0,
      4
    );
    const sinopse = detalhes.overview || "Sem sinopse disponível no momento.";

    const wrapper = document.createElement("div");
    wrapper.classList.add("busca-obra");

    const capa = document.createElement("div");
    capa.classList.add("busca-obra-capa");
    capa.style.backgroundImage = `url('${capaUrl}')`;

    // ColorThief para box-shadow personalizado
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = capaUrl;
    img.onload = () => {
      try {
        const colorThief = new ColorThief();
        const [r, g, b] = colorThief.getColor(img);
        capa.style.boxShadow = `0px 4px 20px rgba(${r}, ${g}, ${b}, 0.2)`;
      } catch {
        capa.style.boxShadow = "0px 4px 20px rgba(0, 0, 0, 0.1)";
      }
    };

    const infoHTML = `
      <div class="busca-obra-informacoes">
        <label class="busca-obra-nome">${title}</label>
        <label class="busca-obra-genero">${generos}</label>
        <div class="busca-obra-review">
          <div class="busca-obra-review-item">
            <div class="busca-obra-icone-estrela"></div>
            <label class="review-texto">${nota}</label>
          </div>
          <label class="review-texto">•</label>
          <div class="busca-obra-review-item">
            <div class="busca-obra-icone-duracao"></div>
            <label class="review-texto">${duracao}</label>
          </div>
          <label class="review-texto">•</label>
          <div class="busca-obra-review-item">
            <label class="review-texto">${ano}</label>
          </div>
        </div>
        <label class="busca-obra-sinopse">${sinopse}</label>
      </div>
    `;

    wrapper.appendChild(capa);
    wrapper.insertAdjacentHTML("beforeend", infoHTML);
    wrapper.dataset.obraId = workId;
    wrapper.dataset.tipo = tipo;

    // Clique SPA usando carregarPagina (igual à pesquisa)
    wrapper.addEventListener("click", () => {
      const navbar = document.querySelector(".navbar");
      if (navbar) navbar.classList.add("navbar-esconde");
      if (typeof window.carregarPagina === "function") {
        window.carregarPagina("paginas/assistir.html", () => {
          if (typeof initAssistir === "function") {
            initAssistir(wrapper.dataset.obraId, wrapper.dataset.tipo);
          }
        });
      }
    });

    return wrapper;
  }

  // SE FOR UMA PLAYLIST, BUSCAR OBRAS DA API
  if (listaTipo === "playlist" && playlistGenero) {
    try {
      let url = "";

      // Definir URL baseada no tipo de playlist
      if (playlistGenero === "trending") {
        url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}&language=pt-BR`;
      } else {
        url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=${playlistGenero}&sort_by=popularity.desc&page=1`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!data.results?.length) {
        listagemConteudo.innerHTML =
          '<label style="color: #999; text-align: center;">Nenhuma obra encontrada</label>';
        return;
      }

      // Processar todas as obras da playlist
      for (const movie of data.results) {
        const card = await criarCardObra(movie.id);
        if (card) {
          listagemConteudo.appendChild(card);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar playlist:", err);
      listagemConteudo.innerHTML =
        '<label style="color: #999; text-align: center;">Erro ao carregar a playlist</label>';
    }
    return; // Importante: sair da função aqui
  }

  // PROCESSAR OBRAS DE "CURTIDAS" E "ASSISTIDOS" (código original)
  try {
    for (const work of listaWorks) {
      const workId = work.work_id || work;
      const card = await criarCardObra(workId);
      if (card) {
        listagemConteudo.appendChild(card);
      }
    }

    // Se não encontrou nenhuma obra válida
    if (listagemConteudo.children.length === 0) {
      listagemConteudo.innerHTML =
        '<label style="color: #999; text-align: center;">Nenhuma obra válida encontrada</label>';
    }
  } catch (err) {
    console.error("Erro ao carregar listagem:", err);
    listagemConteudo.innerHTML =
      '<label style="color: #999; text-align: center;">Erro ao carregar a lista</label>';
  }
}
// ------------------------
// INIT JOGO
// ------------------------
function initJogo() {
  console.log("🎮 Inicializando tela de jogos...");

  setupJogoCards();

  console.log("✅ Tela de jogos inicializada");
}

function setupJogoCards() {
  const jogoCards = document.querySelectorAll(".jogo-card[data-url]");

  jogoCards.forEach((card) => {
    card.style.cursor = "pointer";

    // Efeito hover simples
    card.addEventListener("mouseenter", function () {
      this.style.transform = "scale(1.05)";
      this.style.transition = "transform 0.2s ease";
    });

    card.addEventListener("mouseleave", function () {
      this.style.transform = "scale(1)";
    });

    // Clique para abrir jogo
    card.addEventListener("click", function () {
      const jogoUrl = this.getAttribute("data-url");

      if (jogoUrl) {
        console.log(`🎮 Abrindo jogo: ${jogoUrl}`);
        abrirJogo(jogoUrl);
      }
    });
  });

  console.log(`✅ ${jogoCards.length} cards de jogos configurados`);
}

// FUNÇÃO PRINCIPAL - Abre o jogo
function abrirJogo(url) {
  // Salva apenas a URL do jogo
  const navbar = document.querySelector(".navbar");
  if (navbar) navbar.classList.add("navbar-esconde");
  sessionStorage.setItem("jogoUrl", url);

  console.log(`🎮 Navegando para jogo...`);

  // Usa o sistema de fetch do SPA
  if (typeof window.carregarPagina === "function") {
    window.carregarPagina("paginas/jogoescolhido.html", () => {
      // Chama o init do jogo escolhido após o carregamento
      if (typeof initJogoEscolhido === "function") {
        initJogoEscolhido();
      }
    });
  }
}
// ------------------------
// INIT JOGO ESCOLHIDO - VERSÃO MOBILE COMPATÍVEL
// ------------------------
function initJogoEscolhido() {
  console.log("🎮 Inicializando tela do jogo...");

  const botaoVoltar = document.getElementById("voltar-jogo");
  if (!botaoVoltar) return;

  let movimento = false;
  let startX, startY, offsetX, offsetY;
  let isDragging = false;

  // Clique/Touch (somente se não arrastou)
  botaoVoltar.addEventListener("click", (e) => {
    if (movimento || isDragging) {
      e.stopImmediatePropagation();
      movimento = false;
      isDragging = false;
      return;
    }

    const navbar = document.querySelector(".navbar");
    if (navbar) navbar.classList.remove("navbar-esconde");
    if (typeof window.carregarPagina === "function") {
      window.carregarPagina("paginas/jogos.html", () => {
        if (typeof initJogo === "function") initJogo();
      });
    }
  });

  // EVENTOS PARA MOUSE
  botaoVoltar.addEventListener("mousedown", (e) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  });

  botaoVoltar.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    handleDrag(e.clientX, e.clientY);
  });

  botaoVoltar.addEventListener("mouseup", () => {
    endDrag();
  });

  botaoVoltar.addEventListener("mouseleave", () => {
    if (isDragging) endDrag();
  });

  // EVENTOS PARA TOUCH (MOBILE)
  botaoVoltar.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  }, { passive: false });

  botaoVoltar.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    handleDrag(touch.clientX, touch.clientY);
  }, { passive: false });

  botaoVoltar.addEventListener("touchend", (e) => {
    e.preventDefault();
    endDrag();
    
    // Se foi um toque simples (não arrastou), simula clique
    if (!movimento) {
      const touch = e.changedTouches[0];
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      botaoVoltar.dispatchEvent(clickEvent);
    }
  });

  botaoVoltar.addEventListener("touchcancel", (e) => {
    e.preventDefault();
    endDrag();
  });

  // FUNÇÕES DE CONTROLE DO ARRASTE
  function startDrag(clientX, clientY) {
    movimento = false;
    isDragging = true;
    startX = clientX;
    startY = clientY;
    offsetX = clientX - botaoVoltar.offsetLeft;
    offsetY = clientY - botaoVoltar.offsetTop;

    botaoVoltar.style.transition = "none";
    botaoVoltar.style.cursor = "grabbing";
    botaoVoltar.style.userSelect = "none"; // Evita seleção de texto no mobile
  }

  function handleDrag(clientX, clientY) {
    const dx = clientX - startX;
    const dy = clientY - startY;
    
    // Se moveu mais de 5 pixels, considera que está arrastando
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      movimento = true;
    }

    const larguraTela = window.innerWidth;
    const alturaTela = window.innerHeight;
    const larguraBotao = botaoVoltar.offsetWidth;
    const alturaBotao = botaoVoltar.offsetHeight;

    let novaEsquerda = clientX - offsetX;
    let novoTopo = clientY - offsetY;

    // Mantém dentro da tela
    novaEsquerda = Math.min(
      Math.max(0, novaEsquerda),
      larguraTela - larguraBotao
    );
    novoTopo = Math.min(Math.max(0, novoTopo), alturaTela - alturaBotao);

    botaoVoltar.style.left = `${novaEsquerda}px`;
    botaoVoltar.style.top = `${novoTopo}px`;
  }

  function endDrag() {
    isDragging = false;
    botaoVoltar.style.cursor = "grab";
    botaoVoltar.style.transition = "transform 0.2s, background-color 0.2s";
    botaoVoltar.style.userSelect = "auto";
    
    // Salva a posição no localStorage
    setTimeout(() => {
      localStorage.setItem('botaoVoltarPosX', botaoVoltar.style.left);
      localStorage.setItem('botaoVoltarPosY', botaoVoltar.style.top);
    }, 100);
  }

  // Posição inicial (carrega do localStorage se existir)
  botaoVoltar.style.position = "fixed";
  botaoVoltar.style.cursor = "grab";
  
  const savedX = localStorage.getItem('botaoVoltarPosX');
  const savedY = localStorage.getItem('botaoVoltarPosY');
  
  if (savedX && savedY) {
    botaoVoltar.style.left = savedX;
    botaoVoltar.style.top = savedY;
  } else {
    botaoVoltar.style.left = "30px";
    botaoVoltar.style.top = "30px";
  }

  // CSS adicional para melhor experiência mobile
  botaoVoltar.style.touchAction = "none"; // Importante para prevenir zoom/scroll
  botaoVoltar.style.zIndex = "1000";

  // Carrega o jogo
  const jogoUrl = sessionStorage.getItem("jogoUrl");
  if (jogoUrl) {
    console.log("🎮 Carregando jogo...");
    document.getElementById("game-frame").src = jogoUrl;
  }
}

// Inicializa
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initJogoEscolhido);
} else {
  initJogoEscolhido();
}