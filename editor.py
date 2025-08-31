import sys
import json
from pathlib import Path
from PySide6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QListWidget, QLabel, QTextEdit,
    QPushButton, QHBoxLayout, QMessageBox
)
from PySide6.QtCore import Qt

PROJECTS_FOLDER = Path("data/projects")

class ProjectManager(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Gerenciador de Projetos JSON")
        self.resize(800, 600)
        self.projects = []  # Lista de tuples (caminho, título)
        self.current_project_path = None

        # Layout principal
        layout = QHBoxLayout()
        self.setLayout(layout)

        # Lista de projetos
        self.project_list = QListWidget()
        self.project_list.itemClicked.connect(self.load_project)
        layout.addWidget(self.project_list, 2)

        # Área de edição
        self.editor_layout = QVBoxLayout()
        layout.addLayout(self.editor_layout, 5)

        self.title_label = QLabel("Title:")
        self.title_edit = QTextEdit()
        self.title_edit.setFixedHeight(40)

        self.description_label = QLabel("Description:")
        self.description_edit = QTextEdit()

        self.category_label = QLabel("Categories (comma separated):")
        self.category_edit = QTextEdit()
        self.category_edit.setFixedHeight(60)

        self.status_label = QLabel("Status:")
        self.status_edit = QTextEdit()
        self.status_edit.setFixedHeight(40)

        self.featured_label = QLabel("Featured (true/false):")
        self.featured_edit = QTextEdit()
        self.featured_edit.setFixedHeight(40)

        self.save_button = QPushButton("Salvar Alterações")
        self.save_button.clicked.connect(self.save_project)

        # Adicionando widgets ao layout de edição
        self.editor_layout.addWidget(self.title_label)
        self.editor_layout.addWidget(self.title_edit)
        self.editor_layout.addWidget(self.description_label)
        self.editor_layout.addWidget(self.description_edit)
        self.editor_layout.addWidget(self.category_label)
        self.editor_layout.addWidget(self.category_edit)
        self.editor_layout.addWidget(self.status_label)
        self.editor_layout.addWidget(self.status_edit)
        self.editor_layout.addWidget(self.featured_label)
        self.editor_layout.addWidget(self.featured_edit)
        self.editor_layout.addWidget(self.save_button)

        self.load_projects_list()

    def load_projects_list(self):
        self.project_list.clear()
        self.projects.clear()

        # Procurar todos os JSONs na pasta
        for json_file in PROJECTS_FOLDER.glob("*.json"):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    title = data.get("title", json_file.stem)
                    self.projects.append((json_file, title))
                    self.project_list.addItem(title)
            except Exception as e:
                print(f"Erro ao carregar {json_file}: {e}")

    def load_project(self, item):
        # Encontra o JSON correspondente pelo título
        for path, title in self.projects:
            if title == item.text():
                self.current_project_path = path
                break
        if not self.current_project_path:
            return

        with open(self.current_project_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Carregar campos editáveis
        self.title_edit.setText(data.get("title", ""))
        self.description_edit.setText(data.get("description", ""))

        categories = []
        for cat_dict in data.get("category", []):
            categories.extend(list(cat_dict.values()))
        self.category_edit.setText(", ".join(categories))

        self.status_edit.setText(data.get("status", ""))
        self.featured_edit.setText(str(data.get("featured", False)))

    def save_project(self):
        if not self.current_project_path:
            return
        try:
            with open(self.current_project_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            # Atualizar apenas campos editáveis
            data["title"] = self.title_edit.toPlainText()
            data["description"] = self.description_edit.toPlainText()
            categories_list = [c.strip() for c in self.category_edit.toPlainText().split(",") if c.strip()]
            data["category"] = [{str(i): cat for i, cat in enumerate(categories_list)}]
            data["status"] = self.status_edit.toPlainText()
            data["featured"] = self.featured_edit.toPlainText().lower() == "true"

            with open(self.current_project_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            QMessageBox.information(self, "Sucesso", "Projeto salvo com sucesso!")
            self.load_projects_list()  # Atualiza a lista com novos títulos
        except Exception as e:
            QMessageBox.critical(self, "Erro", f"Falha ao salvar: {e}")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = ProjectManager()
    window.show()
    sys.exit(app.exec())
