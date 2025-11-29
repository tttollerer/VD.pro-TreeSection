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
        this.currentLevelIndex = 0;
        this.history = [];

        // Für peek-right: welches Child-Level soll gezeigt werden
        this.previewChildIndex = null;

        // Level-Breite für Slide-Berechnung
        this.levelWidth = 60;

        this.init();
    }

    init() {
        // Füge Peek-Overlays hinzu
        this.addPeekOverlays();

        // Zeige erstes Level
        this.showLevel(0);

        // Event-Listener für ALLE Node-Contents
        const allNodes = document.querySelectorAll('.tree-node');
        console.log(`Found ${allNodes.length} tree nodes`);

        allNodes.forEach((node, idx) => {
            const content = node.querySelector('.node-content');
            if (content) {
                // Klick-Handler
                content.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.handleNodeClick(e, node);
                });

                // Hover-Handler für Peek-Vorschau
                content.addEventListener('mouseenter', (e) => {
                    this.handleNodeHover(node);
                });

                content.addEventListener('mouseleave', (e) => {
                    this.handleNodeHoverEnd(node);
                });
            }
        });

        // Event-Listener für Peek-Overlay Klicks
        document.querySelectorAll('.peek-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                e.stopPropagation();
                const level = overlay.closest('.tree-level');
                if (level && level.classList.contains('peek-left')) {
                    this.goBack();
                }
            });
        });

        // Back-Button
        this.backBtn.addEventListener('click', () => this.goBack());

        // Keyboard Navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.key === 'Backspace') {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    this.goBack();
                }
            }
            if (e.key === 'ArrowLeft') {
                this.goBack();
            }
        });
    }

    addPeekOverlays() {
        this.levels.forEach(level => {
            // Prüfen ob schon ein Overlay existiert
            if (level.querySelector('.peek-overlay')) return;

            const overlay = document.createElement('div');
            overlay.className = 'peek-overlay';
            overlay.innerHTML = '<i class="fas fa-hand-pointer"></i>';
            level.appendChild(overlay);

            const label = document.createElement('div');
            label.className = 'level-label';
            const levelNum = level.dataset.level;
            if (levelNum === '1') label.textContent = 'Nutzen';
            else if (levelNum === '2') label.textContent = 'Funktionen';
            else if (levelNum === '3') label.textContent = 'Details';
            level.appendChild(label);
        });
    }

    handleNodeHover(node) {
        // Prüfen ob Node im aktiven Level ist
        const parentLevel = node.closest('.tree-level');
        if (!parentLevel) return;
        if (!parentLevel.classList.contains('active')) return;
        if (node.classList.contains('leaf')) return;

        const nodeId = node.dataset.id;
        if (!nodeId) return;

        const childLevel = this.findChildLevel(nodeId);

        if (childLevel) {
            const childIndex = Array.from(this.levels).indexOf(childLevel);
            if (childIndex !== -1) {
                this.previewChildIndex = childIndex;
                this.updateLevelStates();
            }
        }
    }

    handleNodeHoverEnd(node) {
        this.previewChildIndex = null;
        this.updateLevelStates();
    }

    handleNodeClick(event, node) {
        const parentLevel = node.closest('.tree-level');
        if (!parentLevel) return;
        if (!parentLevel.classList.contains('active')) return;

        if (node.classList.contains('leaf')) {
            this.animateLeafClick(node);
            return;
        }

        const nodeId = node.dataset.id;
        if (!nodeId) return;

        const nodeLabel = node.querySelector('.node-headline')?.textContent || '';
        const childLevel = this.findChildLevel(nodeId);

        if (childLevel) {
            this.clearSelection();
            node.classList.add('selected');

            this.history.push({
                levelIndex: this.currentLevelIndex,
                nodeId: nodeId,
                label: nodeLabel
            });

            const childIndex = Array.from(this.levels).indexOf(childLevel);
            this.previewChildIndex = null;
            this.navigateToLevel(childIndex);
            this.updateBreadcrumb();
        }
    }

    findChildLevel(parentId) {
        if (!parentId) return null;
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
        this.updateLevelStates();
        this.backBtn.disabled = this.history.length === 0;
    }

    updateSliderPosition() {
        const translateX = -(this.currentLevelIndex * this.levelWidth);
        this.slider.style.transform = `translateX(${translateX}%)`;
    }

    updateLevelStates() {
        // peek-left: das vorherige Level aus der History
        let peekLeftIndex = null;
        if (this.history.length > 0) {
            peekLeftIndex = this.history[this.history.length - 1].levelIndex;
        }

        // peek-right: das Level über dessen Node wir hovern
        const peekRightIndex = this.previewChildIndex;

        this.levels.forEach((level, index) => {
            level.classList.remove('active', 'peek-left', 'peek-right', 'hidden');

            if (index === this.currentLevelIndex) {
                level.classList.add('active');
            } else if (index === peekLeftIndex) {
                level.classList.add('peek-left');
            } else if (index === peekRightIndex) {
                level.classList.add('peek-right');
            } else {
                level.classList.add('hidden');
            }
        });
    }

    goBack() {
        if (this.history.length === 0) return;

        const previous = this.history.pop();
        this.previewChildIndex = null;
        this.navigateToLevel(previous.levelIndex);
        this.clearSelection();
        this.updateBreadcrumb();
    }

    clearSelection() {
        document.querySelectorAll('.tree-node.selected').forEach(node => {
            node.classList.remove('selected');
        });
    }

    updateBreadcrumb() {
        this.breadcrumb.innerHTML = '';

        const startCrumb = document.createElement('span');
        startCrumb.className = 'crumb';
        startCrumb.textContent = 'Nutzen';
        startCrumb.addEventListener('click', () => this.navigateToRoot());
        this.breadcrumb.appendChild(startCrumb);

        this.history.forEach((item, index) => {
            const separator = document.createElement('span');
            separator.className = 'crumb-separator';
            separator.textContent = '›';
            this.breadcrumb.appendChild(separator);

            const crumb = document.createElement('span');
            crumb.className = 'crumb';
            crumb.textContent = item.label;
            crumb.addEventListener('click', () => this.navigateToCrumb(index));
            this.breadcrumb.appendChild(crumb);
        });

        const crumbs = this.breadcrumb.querySelectorAll('.crumb');
        crumbs.forEach((crumb, idx) => {
            crumb.classList.toggle('active', idx === crumbs.length - 1);
        });
    }

    navigateToRoot() {
        if (this.history.length === 0) return;
        this.history = [];
        this.previewChildIndex = null;
        this.navigateToLevel(0);
        this.clearSelection();
        this.updateBreadcrumb();
    }

    navigateToCrumb(crumbIndex) {
        if (crumbIndex >= this.history.length - 1) return;

        const targetHistory = this.history.slice(0, crumbIndex + 1);
        const targetItem = targetHistory[targetHistory.length - 1];
        const childLevel = this.findChildLevel(targetItem.nodeId);
        const targetIndex = childLevel ? Array.from(this.levels).indexOf(childLevel) : 0;

        this.history = targetHistory;
        this.previewChildIndex = null;
        this.navigateToLevel(targetIndex);
        this.clearSelection();
        this.updateBreadcrumb();
    }

    animateLeafClick(node) {
        const content = node.querySelector('.node-content');
        if (content) {
            content.style.transform = 'scale(0.98)';
            setTimeout(() => {
                content.style.transform = '';
            }, 150);
        }

        const headline = node.querySelector('.node-headline');
        console.log('Ausgewählt:', {
            path: [...this.history.map(h => h.label), headline?.textContent || ''].join(' → ')
        });
    }
}

// Touch/Swipe Support
class SwipeHandler {
    constructor(element, onSwipeRight) {
        this.element = element;
        this.onSwipeRight = onSwipeRight;
        this.startX = 0;
        this.startY = 0;
        this.threshold = 50;
        this.init();
    }

    init() {
        this.element.addEventListener('touchstart', (e) => {
            this.startX = e.touches[0].clientX;
            this.startY = e.touches[0].clientY;
        }, { passive: true });

        this.element.addEventListener('touchend', (e) => {
            const diffX = this.startX - e.changedTouches[0].clientX;
            const diffY = Math.abs(this.startY - e.changedTouches[0].clientY);

            if (Math.abs(diffX) > this.threshold && diffY < 100 && diffX < 0) {
                this.onSwipeRight();
            }
        }, { passive: true });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.featureTree = new FeatureTree();
    new SwipeHandler(document.querySelector('.tree-viewport'), () => window.featureTree.goBack());
});
