/**
 * Vertikale Baum-Navigation
 * Dreistufige horizontale Verschachtelung mit vertikalem Aufbau
 */

class TreeNavigation {
    constructor() {
        this.levels = document.querySelectorAll('.tree-level');
        this.breadcrumb = document.querySelector('.breadcrumb');
        this.selectedPath = []; // Speichert den aktuellen Pfad

        this.init();
    }

    init() {
        // Event-Listener für alle Tree-Items
        document.querySelectorAll('.tree-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleItemClick(e, item));
        });

        // Initial: Nur Level 1 aktiv, Level 2 als Preview
        this.setActiveLevel(1);
        this.showPreview(2);

        // Alle Items in Level 2 und 3 verstecken
        this.hideAllItemsInLevel(2);
        this.hideAllItemsInLevel(3);
    }

    handleItemClick(event, item) {
        const itemId = item.dataset.id;
        const parentLevel = parseInt(item.closest('.tree-level').dataset.level);
        const hasChildren = item.dataset.children;
        const isLeaf = item.classList.contains('leaf');

        // Entferne vorherige Auswahl auf diesem Level
        this.clearSelectionOnLevel(parentLevel);

        // Markiere dieses Item als ausgewählt
        item.classList.add('selected');

        // Aktualisiere den Pfad
        this.selectedPath = this.selectedPath.slice(0, parentLevel - 1);
        this.selectedPath.push({
            id: itemId,
            text: item.querySelector('.item-text').textContent,
            level: parentLevel
        });

        // Aktualisiere Breadcrumb
        this.updateBreadcrumb();

        if (isLeaf) {
            // Leaf-Item: Zeige Auswahl-Feedback
            this.showLeafSelection(item);
            return;
        }

        if (hasChildren) {
            const childIds = hasChildren.split(',');
            const nextLevel = parentLevel + 1;

            // Verstecke alle Items auf den nachfolgenden Levels
            for (let i = nextLevel; i <= 3; i++) {
                this.hideAllItemsInLevel(i);
                this.clearSelectionOnLevel(i);
            }

            // Zeige die Kinder-Items
            this.showChildItems(childIds, nextLevel);

            // Aktiviere das nächste Level
            this.setActiveLevel(nextLevel);

            // Zeige Preview für das übernächste Level
            if (nextLevel < 3) {
                this.showPreview(nextLevel + 1);
            }
        }
    }

    setActiveLevel(level) {
        this.levels.forEach(lvl => {
            const lvlNum = parseInt(lvl.dataset.level);
            lvl.classList.remove('active', 'preview');

            if (lvlNum <= level) {
                lvl.classList.add('active');
            }
        });
    }

    showPreview(level) {
        const previewLevel = document.querySelector(`.tree-level[data-level="${level}"]`);
        if (previewLevel && !previewLevel.classList.contains('active')) {
            previewLevel.classList.add('preview');
        }
    }

    clearSelectionOnLevel(level) {
        const levelEl = document.querySelector(`.tree-level[data-level="${level}"]`);
        if (levelEl) {
            levelEl.querySelectorAll('.tree-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
        }
    }

    hideAllItemsInLevel(level) {
        const levelEl = document.querySelector(`.tree-level[data-level="${level}"]`);
        if (levelEl) {
            levelEl.querySelectorAll('.tree-item').forEach(item => {
                item.classList.add('hidden');
                item.classList.remove('animate-in');
            });
        }
    }

    showChildItems(childIds, level) {
        const levelEl = document.querySelector(`.tree-level[data-level="${level}"]`);
        if (!levelEl) return;

        childIds.forEach((childId, index) => {
            const childItem = levelEl.querySelector(`.tree-item[data-id="${childId.trim()}"]`);
            if (childItem) {
                childItem.classList.remove('hidden');

                // Gestaffelte Animation
                setTimeout(() => {
                    childItem.classList.add('animate-in');
                }, index * 50);
            }
        });
    }

    showLeafSelection(item) {
        // Visuelles Feedback für Leaf-Auswahl
        item.style.transform = 'scale(1.02)';
        setTimeout(() => {
            item.style.transform = '';
        }, 200);

        // Optional: Event für externe Handler
        const event = new CustomEvent('leafSelected', {
            detail: {
                path: this.selectedPath,
                item: item.querySelector('.item-text').textContent
            }
        });
        document.dispatchEvent(event);

        console.log('Ausgewählt:', this.selectedPath.map(p => p.text).join(' > '));
    }

    updateBreadcrumb() {
        // Lösche aktuelle Breadcrumbs (außer Start)
        this.breadcrumb.innerHTML = '';

        // Start-Element
        const startEl = document.createElement('span');
        startEl.className = 'breadcrumb-item';
        startEl.textContent = 'Start';
        startEl.dataset.level = '0';
        startEl.addEventListener('click', () => this.resetToStart());
        this.breadcrumb.appendChild(startEl);

        // Pfad-Elemente
        this.selectedPath.forEach((pathItem, index) => {
            // Separator
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.textContent = '›';
            this.breadcrumb.appendChild(separator);

            // Breadcrumb-Item
            const crumbEl = document.createElement('span');
            crumbEl.className = 'breadcrumb-item';
            if (index === this.selectedPath.length - 1) {
                crumbEl.classList.add('active');
            }
            crumbEl.textContent = pathItem.text;
            crumbEl.dataset.level = pathItem.level;
            crumbEl.dataset.id = pathItem.id;
            crumbEl.addEventListener('click', () => this.navigateToLevel(index));
            this.breadcrumb.appendChild(crumbEl);
        });
    }

    resetToStart() {
        // Zurück zum Anfang
        this.selectedPath = [];

        // Alle Auswahlen entfernen
        document.querySelectorAll('.tree-item.selected').forEach(item => {
            item.classList.remove('selected');
        });

        // Level 2 und 3 verstecken
        this.hideAllItemsInLevel(2);
        this.hideAllItemsInLevel(3);

        // Nur Level 1 aktiv
        this.setActiveLevel(1);
        this.showPreview(2);

        // Breadcrumb aktualisieren
        this.updateBreadcrumb();
    }

    navigateToLevel(pathIndex) {
        if (pathIndex < 0) {
            this.resetToStart();
            return;
        }

        // Kürze den Pfad
        const targetPath = this.selectedPath.slice(0, pathIndex + 1);
        const lastItem = targetPath[targetPath.length - 1];

        // Finde und klicke das entsprechende Element
        const targetItem = document.querySelector(`.tree-item[data-id="${lastItem.id}"]`);
        if (targetItem) {
            // Setze den Pfad zurück vor dem Klick
            this.selectedPath = this.selectedPath.slice(0, pathIndex);
            targetItem.click();
        }
    }
}

// Event-Listener für Leaf-Auswahl (kann extern genutzt werden)
document.addEventListener('leafSelected', (e) => {
    // Hier können weitere Aktionen bei Leaf-Auswahl durchgeführt werden
    // z.B. Modal öffnen, Daten laden, etc.
});

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    new TreeNavigation();
});
