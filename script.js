/**
 * Feature Tree Navigation
 * Vertikaler Baum mit Peek-Ansicht der benachbarten Stufen
 */

class FeatureTree {
    constructor() {
        this.slider = document.getElementById('treeSlider');
        this.backBtn = document.getElementById('backBtn');
        this.breadcrumb = document.getElementById('breadcrumb');
        this.levels = document.querySelectorAll('.tree-level');

        // Navigation State
        this.currentLevelIndex = 0;  // Index des aktuellen Levels im Slider
        this.history = [];           // Stack der Navigation [{levelIndex, nodeId, label}]
        this.visibleLevels = [];     // Aktuell sichtbare Levels [left, center, right]

        // Level-Breite für Slide-Berechnung (60% = 0.6)
        this.levelWidth = 60;

        this.init();
    }

    init() {
        // Füge Peek-Overlays zu allen Levels hinzu
        this.addPeekOverlays();

        // Zeige erstes Level
        this.showLevel(0);

        // Event-Listener für Node-Klicks
        document.querySelectorAll('.tree-node').forEach(node => {
            node.addEventListener('click', (e) => this.handleNodeClick(e, node));
        });

        // Event-Listener für Level-Klicks (für Peek-Navigation)
        this.levels.forEach((level, index) => {
            level.addEventListener('click', (e) => this.handleLevelClick(e, level, index));
        });

        // Back-Button
        this.backBtn.addEventListener('click', () => this.goBack());

        // Keyboard Navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.key === 'Backspace') {
                e.preventDefault();
                this.goBack();
            }
            if (e.key === 'ArrowLeft') {
                this.navigateToPeekLeft();
            }
            if (e.key === 'ArrowRight') {
                this.navigateToPeekRight();
            }
        });
    }

    addPeekOverlays() {
        this.levels.forEach(level => {
            // Overlay für Peek-Ansicht
            const overlay = document.createElement('div');
            overlay.className = 'peek-overlay';
            overlay.innerHTML = '<i class="fas fa-hand-pointer"></i>';
            level.appendChild(overlay);

            // Label für Level-Typ
            const label = document.createElement('div');
            label.className = 'level-label';
            const levelNum = level.dataset.level;
            if (levelNum === '1') label.textContent = 'Nutzen';
            else if (levelNum === '2') label.textContent = 'Funktionen';
            else if (levelNum === '3') label.textContent = 'Details';
            level.appendChild(label);
        });
    }

    handleLevelClick(event, level, index) {
        // Nur reagieren wenn es ein Peek-Level ist
        if (level.classList.contains('peek-left')) {
            event.stopPropagation();
            this.navigateToPeekLeft();
        } else if (level.classList.contains('peek-right')) {
            event.stopPropagation();
            this.navigateToPeekRight();
        }
    }

    navigateToPeekLeft() {
        // Finde das peek-left Level und navigiere dorthin
        const peekLeftLevel = document.querySelector('.tree-level.peek-left');
        if (peekLeftLevel && this.history.length > 0) {
            this.goBack();
        }
    }

    navigateToPeekRight() {
        // Kann nur navigieren wenn ein Node ausgewählt ist
        // Dies wird durch Node-Klick gehandhabt
    }

    handleNodeClick(event, node) {
        event.stopPropagation();

        // Prüfen ob wir im aktiven Level sind
        const parentLevel = node.closest('.tree-level');
        if (!parentLevel.classList.contains('active')) {
            return; // Klicks nur im aktiven Level verarbeiten
        }

        // Wenn Leaf-Node, nur visuelles Feedback
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
                levelIndex: this.currentLevelIndex,
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
        return document.querySelector(`.tree-level[data-parent="${parentId}"]`);
    }

    showLevel(levelIndex) {
        this.currentLevelIndex = levelIndex;
        this.updateSliderPosition();
        this.updateLevelStates();
        this.backBtn.disabled = this.history.length === 0;
    }

    navigateToLevel(levelIndex) {
        this.currentLevelIndex = levelIndex;
        this.updateSliderPosition();

        // Kurze Verzögerung für Animation
        setTimeout(() => {
            this.updateLevelStates();
        }, 50);

        this.backBtn.disabled = this.history.length === 0;
    }

    updateSliderPosition() {
        // Berechne die Translation basierend auf Level-Breite
        // Jedes Level ist 60% breit, wir wollen das aktive Level zentrieren
        const translateX = -(this.currentLevelIndex * this.levelWidth);
        this.slider.style.transform = `translateX(${translateX}%)`;
    }

    updateLevelStates() {
        // Entferne alle State-Klassen
        this.levels.forEach(level => {
            level.classList.remove('active', 'peek-left', 'peek-right', 'hidden');
        });

        // Setze States basierend auf aktuellem Level
        this.levels.forEach((level, index) => {
            if (index === this.currentLevelIndex) {
                level.classList.add('active');
            } else if (this.isAdjacentLevel(index, 'left')) {
                level.classList.add('peek-left');
            } else if (this.isAdjacentLevel(index, 'right')) {
                level.classList.add('peek-right');
            } else {
                level.classList.add('hidden');
            }
        });
    }

    isAdjacentLevel(levelIndex, direction) {
        const currentLevel = this.levels[this.currentLevelIndex];
        const targetLevel = this.levels[levelIndex];

        if (!currentLevel || !targetLevel) return false;

        if (direction === 'left') {
            // Peek-Left: Das vorherige Level in der History
            if (this.history.length === 0) return false;
            const previousHistoryItem = this.history[this.history.length - 1];
            return levelIndex === previousHistoryItem.levelIndex;
        }

        if (direction === 'right') {
            // Peek-Right: Levels die Kinder des aktuellen Levels sein könnten
            // Zeige das erste mögliche Child-Level
            const currentNodes = currentLevel.querySelectorAll('.tree-node:not(.leaf)');
            for (const node of currentNodes) {
                const childLevel = this.findChildLevel(node.dataset.id);
                if (childLevel && Array.from(this.levels).indexOf(childLevel) === levelIndex) {
                    return true;
                }
            }
        }

        return false;
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
        if (crumbIndex >= this.history.length - 1) return;

        // Kürze History
        const targetHistory = this.history.slice(0, crumbIndex + 1);
        const targetItem = targetHistory[targetHistory.length - 1];

        // Finde das Level
        const childLevel = this.findChildLevel(targetItem.nodeId);
        const targetIndex = childLevel ? Array.from(this.levels).indexOf(childLevel) : 0;

        // Update
        this.history = targetHistory;
        this.navigateToLevel(targetIndex);
        this.clearSelection();
        this.updateBreadcrumb();
    }

    animateLeafClick(node) {
        const content = node.querySelector('.node-content');
        content.style.transform = 'scale(0.98)';

        setTimeout(() => {
            content.style.transform = '';
        }, 150);

        // Custom Event
        const event = new CustomEvent('leafSelected', {
            detail: {
                id: node.dataset.id,
                headline: node.querySelector('.node-headline').textContent,
                description: node.querySelector('.node-description').textContent,
                path: this.history.map(h => h.label)
            }
        });
        document.dispatchEvent(event);

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

        if (Math.abs(diffX) > this.threshold && diffY < 100) {
            if (diffX > 0) {
                // Swipe left - nicht verwendet
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

    // Swipe für mobile Navigation
    new SwipeHandler(
        document.querySelector('.tree-viewport'),
        () => {},
        () => tree.goBack()
    );

    // Event-Listener für Leaf-Auswahl
    document.addEventListener('leafSelected', (e) => {
        // Hier können weitere Aktionen durchgeführt werden
    });
});
