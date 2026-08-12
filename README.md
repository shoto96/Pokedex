# Pokédex 

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Bootstrap](https://img.shields.io/badge/Bootstrap_5-7952B3?style=flat-square&logo=bootstrap&logoColor=white)
![PokéAPI](https://img.shields.io/badge/PokéAPI-EF5350?style=flat-square&logo=pokemon&logoColor=white)
![1025 Pokémon](https://img.shields.io/badge/Pokémon-1025+-red?style=flat-square)
![PT-BR](https://img.shields.io/badge/Idioma-PT--BR-brightgreen?style=flat-square)

> Uma Pokédex interativa e completa com todas as 9 gerações de Pokémon (1025+), design premium em glassmorphism e recursos avançados de comparação, quiz e favoritos.

---

## Funcionalidades

### Pokédex Principal
- **1025 Pokémon** de todas as 9 gerações carregados da [PokéAPI](https://pokeapi.co/)
- **Nomes em Português (PT-BR)** — exibe nomes e descrições traduzidas
- **Filtros avançados**: busca por nome/número, tipo e geração
- **Ordenação** por ID ou nome
- **Modo Shiny** com visualização de sprites alternativos
- **Mega Evoluções** com toggle dedicado
- **Ultra Beasts** — detecção automática com badge exclusivo (Geração 7)
- **Dicas de Natures** — recomendações de natures ideais com base nos atributos base
- **Cachê local** com expiração de 7 dias para performance

### Comparação de Pokémon
- Compare **2 Pokémon lado a lado** em tempo real
- Visualização gráfica de cada atributo (HP, ATK, DEF, SPA, SPD, SPE)
- Cálculo automático de **total de base stats** e vencedor
- Interface intuitiva com seleção via modal

### Quiz Interativo
- **3 modos de jogo**:
  - Adivinhar Nome (visual)
  - Adivinhar Sombra (silhueta)
  - Adivinhar Som (grito do Pokémon)
- Pontuação em tempo real
- Feedback visual imediato

### Favoritos
- Adicione Pokémon aos favoritos com 1 clique
- **Exporte** seus favoritos em **JSON** ou **CSV**
- **Importe** coleções de outros usuários
- Persistência via `localStorage`

### Detalhes do Pokémon
- Sprites oficiais com animação
- Barra de atributos animada com cores
- Evolução em cadeia visual
- Informações de altura, peso e habilidades
- Sons originais dos Pokémon

---

## Tecnologias

| Tecnologia | Uso |
|------------|-----|
| **HTML5** | Estrutura semântica da aplicação |
| **CSS3** | Glassmorphism, animações, gradientes e responsividade |
| **JavaScript (Vanilla)** | Lógica completa, consumo de API, estado e interatividade |
| **Bootstrap 5** | Grid responsivo, navbar e componentes utilitários |
| **Font Awesome 6** | Ícones e ícones de tipos |
| **Google Fonts (Outfit + Inter)** | Tipografia moderna e legível |
| **PokéAPI v2** | Fonte de dados de todos os 1025 Pokémon |
| **localStorage** | Cache de dados e persistência de favoritos |

---

## Como Usar

1. Abra o arquivo `index.html` em qualquer navegador moderno
2. Aguarde o carregamento inicial (os primeiros 50 Pokémon são carregados automaticamente)
3. Use **"Carregar Tudo"** para baixar todos os 1025 Pokémon
4. Navegue pelas seções usando a barra superior

---

## Estrutura do Projeto

```
pokedex/
├── index.html          # Página principal com todas as seções
├── css/
│   └── styles.css      # Estilos completos (glassmorphism, animações, responsivo)
├── js/
│   └── app.js          # Lógica completa (API, filtros, quiz, comparação, favoritos)
└── README.md           # Este arquivo
```

---

## Sistema de Comparação

O sistema de comparação permite selecionar dois Pokémon e visualizar:

- **Barras comparativas** para cada atributo (HP, ATK, DEF, SPA, SPD, SPE)
- **Indicador de vencedor** em cada stat
- **Total de base stats** de cada Pokémon
- **Veredito final** com contagem de stats vencedores

Para usar: clique em **Comparar** na navbar, depois nos slots vazios para selecionar os Pokémon.

---

## Ultra Beasts

Pokémon da categoria **Ultra Beast** (Geração 7 — Alola) são detectados automaticamente e exibidos com um badge vermelho exclusivo. São eles:

- Nihilego, Buzzwole, Pheromosa, Xurkitree, Celesteela, Kartana, Guzzlord, Poipole, Naganadel, Stakataka, Blacephalon

---

## Recomendação de Natures

Baseado nos atributos base de cada Pokémon, o sistema sugere as **4 melhores natures**, indicando qual stat é aumentado (+) e qual é diminuído (−). Isso ajuda treinadores a otimizarem seus Pokémon para batalhas competitivas.

---

## Cache e Performance

- Dados dos Pokémon são armazenados em `localStorage` com **expiração de 7 dias**
- Carregamento em **batches de 50 Pokémon** com delay de 500ms para respeitar rate limits
- Sprite loading com `loading="lazy"`
- Após o primeiro carregamento completo, a Pokédex abre instantaneamente

---

## Créditos

- **Dados**: [PokéAPI](https://pokeapi.co/)
- **Sprites**: [PokeAPI Sprites](https://github.com/PokeAPI/sprites)
- **Sons**: [Pokémon Showdown](https://play.pokemonshowdown.com/)
- **Ícones**: [Font Awesome](https://fontawesome.com/)
- **Framework CSS**: [Bootstrap](https://getbootstrap.com/)

---

## Licença

Projeto de uso educacional. Pokémon é uma marca registrada da Nintendo / Game Freak / The Pokémon Company.
