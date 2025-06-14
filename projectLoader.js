class ProjectLoader {
  constructor() {
    this.container = document.getElementById("projects");
    this.totalProjectsElement = document.getElementById("total-projects");
    this.lastUpdateElement = document.getElementById("last-update");
  }

  async loadProjects() {
    try {
      const response = await fetch("master.dat");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const projectNames = (await response.text())
        .split("\n")
        .map(l => l.trim())
        .filter(l => l);

      // Limpar container
      this.container.innerHTML = '';

      if (projectNames.length === 0) {
        this.showError("Nenhum projeto encontrado");
        this.updateProjectStats(0);
        return;
      }

      this.updateProjectStats(0, projectNames.length);

      // Carregar todos projetos em paralelo
      const projectPromises = projectNames.map(name => this.loadProject(name));
      const results = await Promise.allSettled(projectPromises);

      const successfulProjects = results.filter(r => r.status === 'fulfilled').length;
      this.updateProjectStats(successfulProjects, projectNames.length);

    } catch (err) {
      console.error("Erro ao carregar master.dat:", err);
      this.showError("Erro ao carregar lista de projetos");
      this.updateProjectStats(0);
    }
  }

  updateProjectStats(loaded, total = null) {
    if (this.totalProjectsElement) {
      if (total !== null && total !== loaded) {
        this.totalProjectsElement.textContent = `${loaded}/${total} carregados`;
      } else {
        this.totalProjectsElement.textContent = loaded.toString();
      }
    }

    if (this.lastUpdateElement) {
      const now = new Date();
      this.lastUpdateElement.textContent = now.toLocaleDateString('pt-BR');
    }
  }

  showError(msg) {
    if (this.container) {
      this.container.innerHTML = `<p class="error-message">${msg}</p>`;
    }
  }

  async loadProject(projectName) {
    const infPath = `content/${projectName}/inf.dat`;

    try {
      const infResponse = await fetch(infPath);
      if (!infResponse.ok) throw new Error(`HTTP ${infResponse.status}`);

      const lines = (await infResponse.text()).split(/\r?\n/);
      const title = lines[0]?.trim() || projectName;

      const projectData = this.parseProjectData(lines);
      this.createProjectCard(title, projectData);

    } catch (err) {
      console.warn(`Erro ao carregar projeto ${projectName}:`, err);
      this.createErrorCard(projectName, err.message);
      throw err; // para Promise.allSettled contabilizar
    }
  }

  parseProjectData(lines) {
    const mediaItems = [];
    let description = "";
    const linkButtons = [];
    let section = "media";

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (/^descrição/i.test(line)) {
        section = "desc";
        continue;
      }

      if (line.startsWith("LINK|")) {
        const match = line.match(/^LINK\|"(.*)"\|(.*)$/);
        if (match) {
          linkButtons.push({ 
            name: match[1], 
            url: match[2] 
          });
        }
        continue;
      }

      if (section === "media") {
        mediaItems.push(line);
      } else if (section === "desc") {
        description += line + "\n";
      }
    }

    return {
      mediaItems: mediaItems.filter(item => item),
      description: description.trim(),
      linkButtons
    };
  }

createProjectCard(title, data) {
  const card = document.createElement("div");
  card.className = "project-card";

  // Título
  const titleEl = document.createElement("h2");
  titleEl.className = "project-title";
  titleEl.textContent = title;
  card.appendChild(titleEl);

  // Wrapper do conteúdo
  const wrapper = document.createElement("div");
  wrapper.className = "content-wrapper";

  // Conteúdo de texto (onde ficará carrossel + texto)
  const textContent = document.createElement("div");
  textContent.className = "text-content";

  // Carrossel dentro do textContent
  if (data.mediaItems.length > 0) {
    const carouselEl = this.createCarousel(data.mediaItems, title);
    textContent.appendChild(carouselEl);
  }

  // Descrição
  if (data.description) {
    const desc = document.createElement("div");
    desc.className = "project-description";
    desc.textContent = data.description;
    textContent.appendChild(desc);
  }

  // Links
  if (data.linkButtons.length > 0) {
    const linksContainer = document.createElement("div");
    linksContainer.className = "links-container";

    data.linkButtons.forEach(({ name, url }) => {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "project-link";
      link.textContent = name;
      linksContainer.appendChild(link);
    });

    textContent.appendChild(linksContainer);
  }

  // Adiciona o textContent no wrapper
  wrapper.appendChild(textContent);
  card.appendChild(wrapper);
  this.container.appendChild(card);
}

  createErrorCard(projectName, errorMsg) {
    const card = document.createElement("div");
    card.className = "project-card error-card";

    const titleEl = document.createElement("h2");
    titleEl.className = "project-title";
    titleEl.textContent = `Erro no projeto: ${projectName}`;
    card.appendChild(titleEl);

    const errorEl = document.createElement("p");
    errorEl.className = "error-message";
    errorEl.textContent = errorMsg;
    card.appendChild(errorEl);

    this.container.appendChild(card);
  }

  createCarousel(mediaItems, projectTitle) {
    const container = document.createElement("div");
    container.className = "carousel-container";

    // Fundo desfocado
    const blurBg = document.createElement("div");
    blurBg.className = "carousel-blur-bg";

    const bgImage = this.getImageUrl(mediaItems[0]);
    if (bgImage) {
      blurBg.style.backgroundImage = `url('${bgImage}')`;
    }
    container.appendChild(blurBg);

    // Carrossel
    const carousel = document.createElement("div");
    carousel.className = "carousel";

    mediaItems.forEach(item => {
      const slideEl = document.createElement("div");
      slideEl.className = "carousel-item";

      const mediaEl = this.createMediaElement(item);
      slideEl.appendChild(mediaEl);
      carousel.appendChild(slideEl);
    });

    container.appendChild(carousel);

    // Indicadores (se mais de 1 item)
    if (mediaItems.length > 1) {
      const indicators = this.createIndicators(mediaItems.length);
      container.appendChild(indicators);

      this.setupCarousel(carousel, indicators, mediaItems.length);
    }

    return container;
  }

  getImageUrl(item) {
    if (this.isYouTubeUrl(item)) {
      const videoId = this.extractYouTubeId(item);
      return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
    }
    return item;
  }

  createMediaElement(item) {
    if (this.isYouTubeUrl(item)) {
      const videoId = this.extractYouTubeId(item);
      if (videoId) {
        const link = document.createElement("a");
        link.href = `https://www.youtube.com/watch?v=${videoId}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        const img = document.createElement("img");
        img.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        img.alt = "Vídeo do YouTube";
        img.loading = "lazy";

        link.appendChild(img);
        return link;
      }
    }

    const img = document.createElement("img");
    img.src = item;
    img.alt = "Imagem do projeto";
    img.loading = "lazy";
    return img;
  }

  isYouTubeUrl(url) {
    return url.includes("youtube.com") || url.includes("youtu.be");
  }

  extractYouTubeId(url) {
    try {
      if (url.includes("youtube.com/watch")) {
        const urlObj = new URL(url);
        return urlObj.searchParams.get("v");
      } else if (url.includes("youtu.be")) {
        return url.split("/").pop().split("?")[0];
      } else if (url.includes("youtube.com/shorts")) {
        return url.split("/").pop().split("?")[0];
      }
    } catch (e) {
      console.warn("Erro ao extrair ID do YouTube:", e);
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

    intervalId = setInterval(nextSlide, 4000);

    // Navegação manual ao clicar nos indicadores
    indicatorElements.forEach((ind, i) => {
      ind.addEventListener("click", () => {
        currentIndex = i;
        updateCarousel();
        clearInterval(intervalId);
        intervalId = setInterval(nextSlide, 4000);
      });
    });

    // Pausar o carrossel ao passar o mouse
    carousel.parentElement.addEventListener("mouseenter", () => {
      clearInterval(intervalId);
    });

    carousel.parentElement.addEventListener("mouseleave", () => {
      intervalId = setInterval(nextSlide, 4000);
    });

    updateCarousel();
  }
}
