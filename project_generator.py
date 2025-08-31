import os
import json
import hashlib
from pathlib import Path
from datetime import datetime

# Pastas
ASSETS_DIR = Path("assets/projects")
DATA_DIR = Path("data/projects")
DATA_DIR.mkdir(parents=True, exist_ok=True)

def generate_id(name: str) -> str:
    """Gera um id consistente a partir do nome do projeto."""
    return f"project-{hashlib.md5(name.encode()).hexdigest()[:8]}"

def scan_project_folder(project_folder: Path):
    """Retorna lista de imagens existentes na pasta do projeto."""
    images = sorted(project_folder.glob("*.[jp][pn]g"))  # jpg, png
    media = []
    for order, img in enumerate(images, 1):
        media.append({
            "type": "image",
            "url": str(img).replace("\\", "/"),
            "alt": f"Imagem do projeto - {order}",
            "caption": "Imagem do projeto",
            "order": order
        })
    return media

def load_existing_project_json(json_path: Path):
    """Carrega JSON individual existente, se houver."""
    if json_path.exists():
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

def save_json(json_data, json_path: Path):
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)

def scan_project_folder(project_folder: Path, existing_media=None):
    """Retorna lista de imagens existentes na pasta do projeto, mantendo outros tipos de mídia existentes."""
    if existing_media is None:
        existing_media = []

    # Mantém tudo que não seja imagem
    media = [m for m in existing_media if m.get("type") != "image"]

    # Extensões de imagem suportadas
    image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"}

    # Adiciona imagens encontradas na pasta
    images = sorted([f for f in project_folder.iterdir() if f.suffix.lower() in image_extensions])
    starting_order = max([m.get("order", 0) for m in existing_media], default=0) + 1
    for idx, img in enumerate(images, start=starting_order):
        media.append({
            "type": "image",
            "url": str(img).replace("\\", "/"),
            "alt": f"Imagem do projeto - {idx}",
            "caption": "Imagem do projeto",
            "order": idx
        })

    return media

def update_project_json(project_folder: Path):
    project_name = project_folder.name
    project_id = generate_id(project_name)
    json_path = DATA_DIR / f"{project_id}.json"
    existing = load_existing_project_json(json_path)
    
    now = datetime.utcnow().isoformat() + "Z"
    
    if existing:
        description = existing.get("description", "")
        links = existing.get("links", [])
        existing_category = existing.get("category", [])
        if not isinstance(existing_category, list):
            existing_category = []
        category = existing_category
        metrics = existing.get("metrics", {"views": 0, "likes": 0, "shares": 0})
        last_modified = now
        existing_media = existing.get("media", [])
    else:
        description = ""
        links = []
        category = []
        metrics = {"views": 0, "likes": 0, "shares": 0}
        last_modified = now
        existing_media = []

    media = scan_project_folder(project_folder, existing_media=existing_media)

    project_json = {
        "id": project_id,
        "title": project_name.replace("_", " ").title(),
        "slug": project_name.lower().replace(" ", "-"),
        "description": description,
        "category": category,
        "status": "active",
        "featured": False,
        "dates": {
            "created": existing["dates"]["created"] if existing else now,
            "lastModified": last_modified
        },
        "media": media,
        "links": links,
        "metrics": metrics
    }

    save_json(project_json, json_path)
    return project_json
def generate_master_json(projects_json_list):
    now = datetime.utcnow().isoformat() + "Z"

    # Extrai todas as categorias únicas
    all_categories = set()
    for p in projects_json_list:
        for cat_dict in p.get("category", []):
            all_categories.update(cat_dict.values())

    master_json = {
        "metadata": {
            "version": "2.0",
            "lastUpdate": now,
            "totalProjects": len(projects_json_list),
            "categories": list(all_categories),
            "featuredCount": sum(1 for p in projects_json_list if p["featured"]),
            "generator": "Python Project Generator v2.0"
        },
        "projects": [
            {
                "id": p["id"],
                "slug": p["slug"],
                "title": p["title"],
                "status": p["status"],
                "featured": p["featured"],
                "category": p["category"],  # mantém o formato de lista de dicionários
                "lastModified": p["dates"]["lastModified"]
            }
            for p in projects_json_list
        ]
    }
    save_json(master_json, DATA_DIR.parent / "projects.json")
    
def main():
    all_projects = []
    for project_folder in ASSETS_DIR.iterdir():
        if project_folder.is_dir():
            project_json = update_project_json(project_folder)
            all_projects.append(project_json)
    
    generate_master_json(all_projects)
    print(f"Processamento concluído: {len(all_projects)} projetos atualizados.")

if __name__ == "__main__":
    main()
