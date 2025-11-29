/**
 * Feature Tree Navigation
 * Vertikaler Baum mit horizontalem Swipe zwischen Levels
 */

class FeatureTree {
    constructor() {
        this.slider = document.getElementById('treeSlider');
        this.backBtn = document.getElementById('backBtn');
        this.breadcrumb = document.getElementById('breadcrumb');
        this.levels = document.querySelectorAll('.tree-level');

        // Navigation State
        this.currentLevel = 0;  // Index des aktuellen Levels im Slider
        this.history = [];      // Stack der Navigation [{levelIndex, nodeId, label}]

        this.init();
    }

    init() {
        // Zeige erstes Level (Level 1 = Nutzen)
        this.showLevel(0);

        // Event-Listener für alle Nodes
        document.querySelectorAll('.tree-node').forEach(node => {
            node.addEventListener('click', (e) => this.handleNodeClick(e, node));
        });

        // Back-Button
        this.backBtn.addEventListener('click', () => this.goBack());

        // Keyboard Navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.key === 'Backspace') {
                e.preventDefault();
                this.goBack();
            }
        });
    }

    handleNodeClick(event, node) {
        // Wenn Leaf-Node, nichts tun (außer visuelles Feedback)
        if (node.classList.contains('leaf')) {
            this.animateLeafClick(node);
            return;
        }

        const nodeId = node.dataset.id;
        const nodeLabel = node.querySelector('.node-headline').textContent;

        // Finde das passende Child-Level
        const childLevel = this.findChildLevel(nodeId);

        if (childLevel) {
            // Markiere ausgewählten Node
            this.clearSelection();
            node.classList.add('selected');

            // Speichere aktuelle Position in History
            this.history.push({
                levelIndex: this.currentLevel,
                nodeId: nodeId,
                label: nodeLabel
            });

            // Finde Index des Child-Levels
            const childIndex = Array.from(this.levels).indexOf(childLevel);

            // Navigiere zum Child-Level
            this.navigateToLevel(childIndex);

            // Update Breadcrumb
            this.updateBreadcrumb();
        }
    }

    findChildLevel(parentId) {
        // Suche Level mit data-parent="parentId"
        return document.querySelector(`.tree-level[data-parent="${parentId}"]`);
    }

    navigateToLevel(levelIndex) {
        // Berechne Translation für Slider
        const translateX = -levelIndex * 100;
        this.slider.style.transform = `translateX(${translateX}%)`;

        // Deaktiviere altes Level
        this.levels[this.currentLevel].classList.remove('active');

        // Aktiviere neues Level nach kurzer Verzögerung für Animation
        setTimeout(() => {
            this.levels[levelIndex].classList.add('active');
        }, 100);

        this.currentLevel = levelIndex;

        // Back-Button aktivieren wenn nicht auf erstem Level
        this.backBtn.disabled = this.history.length === 0;
    }

    showLevel(levelIndex) {
        // Initiale Anzeige ohne Animation
        this.levels.forEach((level, idx) => {
            level.classList.toggle('active', idx === levelIndex);
        });
        this.currentLevel = levelIndex;
    }

    goBack() {
        if (this.history.length === 0) return;

        // Pop letzte Position aus History
        const previous = this.history.pop();

        // Navigiere zurück
        this.navigateToLevel(previous.levelIndex);

        // Clear Selection
        this.clearSelection();

        // Update Breadcrumb
        this.updateBreadcrumb();
    }

    clearSelection() {
        document.querySelectorAll('.tree-node.selected').forEach(node => {
            node.classList.remove('selected');
        });
    }

    updateBreadcrumb() {
        this.breadcrumb.innerHTML = '';

        // Start-Crumb (Nutzen)
        const startCrumb = document.createElement('span');
        startCrumb.className = 'crumb';
        startCrumb.textContent = 'Nutzen';
        startCrumb.addEventListener('click', () => this.navigateToRoot());
        this.breadcrumb.appendChild(startCrumb);

        // History-Crumbs
        this.history.forEach((item, index) => {
            // Separator
            const separator = document.createElement('span');
            separator.className = 'crumb-separator';
            separator.textContent = '›';
            this.breadcrumb.appendChild(separator);

            // Crumb
            const crumb = document.createElement('span');
            crumb.className = 'crumb';
            crumb.textContent = item.label;
            crumb.addEventListener('click', () => this.navigateToCrumb(index));
            this.breadcrumb.appendChild(crumb);
        });

        // Markiere letzten Crumb als aktiv
        const crumbs = this.breadcrumb.querySelectorAll('.crumb');
        crumbs.forEach((crumb, idx) => {
            crumb.classList.toggle('active', idx === crumbs.length - 1);
        });
    }

    navigateToRoot() {
        if (this.history.length === 0) return;

        // Clear history
        this.history = [];

        // Navigiere zu Level 0
        this.navigateToLevel(0);
        this.clearSelection();
        this.updateBreadcrumb();
    }

    navigateToCrumb(crumbIndex) {
        // crumbIndex 0 = erstes Item in History (nach Nutzen)
        // Wir müssen zu diesem Punkt navigieren

        if (crumbIndex >= this.history.length - 1) return; // Bereits dort

        // Kürze History
        const targetHistory = this.history.slice(0, crumbIndex + 1);
        const targetItem = targetHistory[targetHistory.length - 1];

        // Finde das Level, das zu diesem History-Item gehört
        const childLevel = this.findChildLevel(targetItem.nodeId);
        const targetIndex = childLevel ? Array.from(this.levels).indexOf(childLevel) : 0;

        // Update History
        this.history = targetHistory;

        // Navigiere
        this.navigateToLevel(targetIndex);
        this.clearSelection();
        this.updateBreadcrumb();
    }

    animateLeafClick(node) {
        // Visuelles Feedback für Leaf-Nodes
        const content = node.querySelector('.node-content');
        content.style.transform = 'scale(0.98)';

        setTimeout(() => {
            content.style.transform = '';
        }, 150);

        // Optional: Custom Event für externe Verwendung
        const event = new CustomEvent('leafSelected', {
            detail: {
                id: node.dataset.id,
                headline: node.querySelector('.node-headline').textContent,
                description: node.querySelector('.node-description').textContent,
                path: this.history.map(h => h.label)
            }
        });
        document.dispatchEvent(event);

        // Log für Demo
        console.log('Ausgewählt:', {
            path: [...this.history.map(h => h.label), node.querySelector('.node-headline').textContent].join(' → ')
        });
    }
}

// Touch/Swipe Support
class SwipeHandler {
    constructor(element, onSwipeLeft, onSwipeRight) {
        this.element = element;
        this.onSwipeLeft = onSwipeLeft;
        this.onSwipeRight = onSwipeRight;
        this.startX = 0;
        this.startY = 0;
        this.threshold = 50;

        this.init();
    }

    init() {
        this.element.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        this.element.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
    }

    handleTouchStart(e) {
        this.startX = e.touches[0].clientX;
        this.startY = e.touches[0].clientY;
    }

    handleTouchEnd(e) {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;

        const diffX = this.startX - endX;
        const diffY = Math.abs(this.startY - endY);

        // Nur horizontale Swipes erkennen
        if (Math.abs(diffX) > this.threshold && diffY < 100) {
            if (diffX > 0) {
                // Swipe left - nicht verwendet, Navigation erfolgt durch Klick
            } else {
                // Swipe right - zurück
                this.onSwipeRight();
            }
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const tree = new FeatureTree();

    // Swipe für mobile Navigation (zurück)
    new SwipeHandler(
        document.querySelector('.tree-viewport'),
        () => {}, // Swipe left - nicht verwendet
        () => tree.goBack() // Swipe right - zurück
    );

    // Event-Listener für Leaf-Auswahl (kann extern genutzt werden)
    document.addEventListener('leafSelected', (e) => {
        // Hier können weitere Aktionen bei Leaf-Auswahl durchgeführt werden
        // z.B. Modal öffnen, Details anzeigen, etc.
    });
});
