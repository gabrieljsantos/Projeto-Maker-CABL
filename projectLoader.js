class ModernProjectLoader {
  constructor() {
    this.container = document.getElementById("projects");
    this.totalProjectsElement = document.getElementById("total-projects");
    this.lastUpdateElement = document.getElementById("last-update");
    this.statusElement = document.getElementById("project-status");
    this.featuredCountElement = document.getElementById("featured-count");
    this.filterButtonsContainer = document.getElementById("filter-buttons");
    this.allProjects = [];
    this.currentFilter = 'all';
    this.categories = new Set();
  }

  async loadProjects() {
    try {
      const response = await fetch("data/projects.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const masterData = await response.json();
      
      this.updateGeneralInfo(masterData);
      this.container.innerHTML = '';
      
      if (!masterData.projects || masterData.projects.length === 0) {
        this.showError("Nenhum projeto encontrado");
        return;
      }

      // Carrega projetos individuais
      const projectPromises = masterData.projects.map(project =>
        this.loadIndividualProject(project.id)
      );
      
      const results = await Promise.allSettled(projectPromises);
      this.allProjects = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(project => project !== null);

      // Coleta todas as categorias dos projetos carregados
      this.collectCategories();
      
      // Gera filtros dinâmicos
      this.generateFilters();
      
      // Renderiza projetos
      this.renderProjects();
      
      // Atualiza contadores
      this.updateProjectCount();
      
    } catch (err) {
      console.error("Erro ao carregar projetos:", err);
      this.showError("Erro ao carregar projetos. Verifique se os arquivos JSON existem.");
    }
  }

  async loadIndividualProject(projectId) {
    try {
      const response = await fetch(`data/projects/${projectId}.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn(`Erro ao carregar projeto ${projectId}:`, err);
      return null;
    }
  }

  collectCategories() {
    this.categories.clear();
    this.allProjects.forEach(project => {
      // Usa category se existir, senão usa as technologies como categorias
      if (project.category && Array.isArray(project.category)) {
        project.category.forEach(catObj => {
          Object.values(catObj).forEach(cat => {
            if (cat && cat !== 'other') this.categories.add(cat);
          });
        });

      } else if (project.technologies && project.technologies.length > 0) {
        // Usa a primeira tecnologia como categoria principal
        this.categories.add(project.technologies[0]);
      }
    });
  }

  generateFilters() {
    this.filterButtonsContainer.innerHTML = '';
    
    // Botão "Todos"
    const allButton = document.createElement('button');
    allButton.className = 'filter-btn active';
    allButton.dataset.category = 'all';
    allButton.textContent = 'Todos';
    this.filterButtonsContainer.appendChild(allButton);

    // Botões para cada categoria
    const sortedCategories = Array.from(this.categories).sort();
    sortedCategories.forEach(category => {
      const button = document.createElement('button');
      button.className = 'filter-btn';
      button.dataset.category = category;
      button.textContent = this.getCategoryDisplayName(category);
      this.filterButtonsContainer.appendChild(button);
    });

    // Adiciona event listeners
    this.initializeFilters();
  }

  initializeFilters() {
    const filterButtons = this.filterButtonsContainer.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.category;
        this.renderProjects();
        this.updateProjectCount();
      });
    });
  }

  updateGeneralInfo(masterData) {
    if (this.totalProjectsElement) {
      this.totalProjectsElement.textContent = masterData.metadata.totalProjects || 0;
    }
    
    if (this.lastUpdateElement && masterData.metadata.lastUpdate) {
      const date = new Date(masterData.metadata.lastUpdate);
      this.lastUpdateElement.textContent = date.toLocaleDateString('pt-BR');
    }
    
    if (this.statusElement) {
      this.statusElement.textContent = "Ativo";
    }
  }

  renderProjects() {
    const filteredProjects = this.getFilteredProjects();

    this.container.innerHTML = '';
    if (filteredProjects.length === 0) {
      this.container.innerHTML = '<p class="no-projects">Nenhum projeto encontrado nesta categoria.</p>';
      return;
    }

    // Ordena projetos: featured primeiro, depois alfabeticamente
    filteredProjects.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.title.localeCompare(b.title);
    });

    filteredProjects.forEach(project => this.createProjectCard(project));
  }

  getFilteredProjects() {
    if (this.currentFilter === 'all') {
      return this.allProjects;
    }

    return this.allProjects.filter(project => {
      // Verifica se a categoria corresponde
      if (project.category && Array.isArray(project.category)) {
        for (const catObj of project.category) {
          if (Object.values(catObj).includes(this.currentFilter)) return true;
        }
      }
      
      // Verifica se alguma tecnologia corresponde
      if (project.technologies && project.technologies.includes(this.currentFilter)) {
        return true;
      }
      
      return false;
    });
  }

  updateProjectCount() {
    const filteredCount = this.getFilteredProjects().length;
    const featuredCount = this.allProjects.filter(p => p.featured).length;
    
    if (this.totalProjectsElement) {
      this.totalProjectsElement.textContent = this.currentFilter === 'all' 
        ? this.allProjects.length 
        : `${filteredCount}/${this.allProjects.length}`;
    }
    
    if (this.featuredCountElement) {
      this.featuredCountElement.textContent = featuredCount;
    }
  }

  createProjectCard(project) {
    const card = document.createElement("div");
    card.className = `project-card ${project.featured ? 'featured' : ''}`;
    
    // Determina a categoria para o dataset
    let categoryArray = [];
    if (project.category && Array.isArray(project.category)) {
      project.category.forEach(catObj => {
        categoryArray.push(...Object.values(catObj));
      });
    }
    if (categoryArray.length === 0 && project.technologies && project.technologies.length > 0) {
      categoryArray.push(project.technologies[0]);
    }
    if (categoryArray.length === 0) categoryArray.push('other');

    card.dataset.category = categoryArray.join(','); // se precisar de dataset, pode juntar em string


    // Título do projeto
    const titleEl = document.createElement("h2");
    titleEl.className = "project-title";
    titleEl.textContent = project.title;
    card.appendChild(titleEl);

    // Badges do projeto (apenas featured)
    if (project.featured) {/*
      const badgesContainer = document.createElement("div");
      badgesContainer.className = "project-badges";
      
      const featuredBadge = document.createElement("span");
      featuredBadge.className = "featured-badge";
      featuredBadge.textContent = "Destaque";
      badgesContainer.appendChild(featuredBadge);
      
      card.appendChild(badgesContainer);
      */
    }

    // Content wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "content-wrapper";

    const textContent = document.createElement("div");
    textContent.className = "text-content";

    // Carousel de mídia
    if (project.media && project.media.length > 0) {
      const carouselEl = this.createCarousel(project.media, project.title);
      textContent.appendChild(carouselEl);
    }

    // Descrição
    if (project.description) {
      const desc = document.createElement("div");
      desc.className = "project-description";
      desc.textContent = project.description;
      textContent.appendChild(desc);
    }

    // Tecnologias
    if (project.technologies && project.technologies.length > 0) {
      const techContainer = document.createElement("div");
      techContainer.className = "technologies-container";
      
      const techLabel = document.createElement("h4");
      techLabel.textContent = "Tecnologias:";
      techContainer.appendChild(techLabel);
      
      const techList = document.createElement("div");
      techList.className = "tech-list";
      
      project.technologies.forEach(tech => {
        const techItem = document.createElement("span");
        techItem.className = "tech-item";
        techItem.textContent = tech;
        techList.appendChild(techItem);
      });
      
      techContainer.appendChild(techList);
      textContent.appendChild(techContainer);
    }

    // Links
    if (project.links && project.links.length > 0) {
      const linksContainer = document.createElement("div");
      linksContainer.className = "links-container";
      
      project.links.forEach(link => {
        const linkEl = document.createElement("a");
        linkEl.href = link.url;
        linkEl.target = "_blank";
        linkEl.rel = "noopener noreferrer";
        linkEl.className = "project-link";
        linkEl.textContent = link.name;
        linksContainer.appendChild(linkEl);
      });
      
      textContent.appendChild(linksContainer);
    }

    wrapper.appendChild(textContent);
    card.appendChild(wrapper);
    this.container.appendChild(card);
  }

  getCategoryDisplayName(category) {
    const displayNames = {
      // Categorias tradicionais
      'web': 'Web',
      'mobile': 'Mobile',
      'design': 'Design',
      'game': 'Games',
      'other': 'Outros',
      
      // Tecnologias específicas do maker
      'Impressora 3D': 'Impressão 3D',
      'Impressora3d': 'Impressão 3D',
      'Scratch': 'Scratch',
      'CNC Laser': 'CNC Laser',
      'CNClaser': 'CNC Laser',
      'Tinkercad': 'Tinkercad',
      'tinkercad': 'Tinkercad',
      'Code.org': 'Code.org',
      'code.org': 'Code.org',
      'Makey Makey': 'Makey Makey',
      'makey_makey': 'Makey Makey',
      'makeymakey': 'Makey Makey',
      'Minecraft': 'Minecraft',
      'minecraft': 'Minecraft',
      'Pintura': 'Pintura',
      'pintura': 'Pintura',
      'Arte': 'Arte',
      'arte': 'Arte',
      'Modelagem 3D': 'Modelagem 3D',
      'modelagem3d': 'Modelagem 3D',
      'Circuitos': 'Circuitos',
      'circuitos': 'Circuitos',
      'Instrumentos musicais': 'Instrumentos',
      'instrumentos': 'Instrumentos',
      'Projeto Sustentável': 'Sustentabilidade',
      'projeto_sustentavel': 'Sustentabilidade',
      'Animais': 'Animais',
      'animais': 'Animais',
      'Musica': 'Música',
      'musica': 'Música',
      'Papelão': 'Papelão',
      'Papelao': 'Papelão',
      'papelao': 'Papelão'
    };
    
    return displayNames[category] || category;
  }

  createCarousel(mediaItems) {
    const container = document.createElement("div");
    container.className = "carousel-container";

    // Background blur
    const blurBg = document.createElement("div");
    blurBg.className = "carousel-blur-bg";
    const bgImage = this.getImageUrl(mediaItems[0]);
    if (bgImage) blurBg.style.backgroundImage = `url('${bgImage}')`;
    container.appendChild(blurBg);

    // Carousel
    const carousel = document.createElement("div");
    carousel.className = "carousel";

    mediaItems.forEach(item => {
      const slideEl = document.createElement("div");
      slideEl.className = "carousel-item";
      slideEl.appendChild(this.createMediaElement(item));
      carousel.appendChild(slideEl);
    });

    container.appendChild(carousel);

    // Indicadores (apenas se houver múltiplos itens)
    if (mediaItems.length > 1) {
      const indicators = this.createIndicators(mediaItems.length);
      container.appendChild(indicators);
      this.setupCarousel(carousel, indicators, mediaItems.length);
    }

    return container;
  }

  getImageUrl(mediaItem) {
    if (mediaItem.type === 'video' && this.isYouTubeUrl(mediaItem.url)) {
      const videoId = this.extractYouTubeId(mediaItem.url);
      return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
    }
    return mediaItem.url;
  }

  createMediaElement(mediaItem) {
    if (mediaItem.type === 'video' && this.isYouTubeUrl(mediaItem.url)) {
      const videoId = this.extractYouTubeId(mediaItem.url);
      if (videoId) {
        const link = document.createElement("a");
        link.href = `https://www.youtube.com/watch?v=${videoId}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        
        const img = document.createElement("img");
        img.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        img.alt = mediaItem.alt || "Vídeo do YouTube";
        img.loading = "lazy";
        
        link.appendChild(img);
        return link;
      }
    }
    
    const img = document.createElement("img");
    img.src = mediaItem.url;
    img.alt = mediaItem.alt || "Imagem do projeto";
    img.loading = "lazy";
    return img;
  }

  isYouTubeUrl(url) {
    return url.includes("youtube.com") || url.includes("youtu.be");
  }

  extractYouTubeId(url) {
    try {
      if (url.includes("youtube.com/watch")) {
        return new URL(url).searchParams.get("v");
      }
      if (url.includes("youtu.be")) {
        return url.split("/").pop().split("?")[0];
      }
      if (url.includes("youtube.com/shorts")) {
        return url.split("/").pop().split("?")[0];
      }
    } catch {
      return null;
    }
    return null;
  }

  createIndicators(count) {
    const indicators = document.createElement("div");
    indicators.className = "carousel-indicators";
    
    for (let i = 0; i < count; i++) {
      const indicator = document.createElement("div");
      indicator.className = `indicator ${i === 0 ? 'active' : ''}`;
      indicators.appendChild(indicator);
    }
    
    return indicators;
  }

  setupCarousel(carousel, indicators, itemCount) {
    let currentIndex = 0;
    const indicatorElements = indicators.querySelectorAll(".indicator");
    let intervalId;

    const updateCarousel = () => {
      carousel.style.transform = `translateX(-${currentIndex * 100}%)`;
      indicatorElements.forEach((ind, i) => {
        ind.classList.toggle("active", i === currentIndex);
      });
    };

    const nextSlide = () => {
      currentIndex = (currentIndex + 1) % itemCount;
      updateCarousel();
    };

    // Auto-play
    intervalId = setInterval(nextSlide, 4000);

    // Click nos indicadores
    indicatorElements.forEach((ind, i) => {
      ind.addEventListener("click", () => {
        currentIndex = i;
        updateCarousel();
        clearInterval(intervalId);
        intervalId = setInterval(nextSlide, 4000);
      });
    });

    // Pausa no hover
    carousel.parentElement.addEventListener("mouseenter", () => {
      clearInterval(intervalId);
    });
    
    carousel.parentElement.addEventListener("mouseleave", () => {
      intervalId = setInterval(nextSlide, 4000);
    });

    updateCarousel();
  }

  showError(message) {
    this.container.innerHTML = `<p class="error-message">${message}</p>`;
    if (this.filterButtonsContainer) {
      this.filterButtonsContainer.innerHTML = '<p class="filter-error">Erro ao carregar filtros</p>';
    }
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  const loader = new ModernProjectLoader();
  loader.loadProjects();
});