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
            overlay.innerHTML = '<i></i><div class="peek-overlay-title"></div>'; // Icon wird per CSS, Title per JS gesetzt
            level.appendChild(overlay);

            const label = document.createElement('div');
            label.className = 'level-label';
            const levelNum = level.dataset.level;
            if (levelNum === '1') label.textContent = 'Nutzen';
            else if (levelNum === '2') label.textContent = 'Funktionen';
            else if (levelNum === '3') label.textContent = 'Details';
            level.appendChild(label);
        });

        // Add parent context container
        this.parentContext = document.createElement('div');
        this.parentContext.className = 'parent-context';
        this.parentContext.innerHTML = '<div class="parent-context-inner"></div>';
        this.slider.parentElement.insertBefore(this.parentContext, this.slider);
    }

    updateParentContext() {
        const inner = this.parentContext.querySelector('.parent-context-inner');
        inner.innerHTML = '';

        // 1. Root Context (Immer anzeigen)
        const rootCard = document.createElement('div');
        rootCard.className = 'parent-context-card root-card';
        // Mark active if no history (we are at root)
        if (this.history.length === 0) rootCard.classList.add('active-context');
        
        rootCard.innerHTML = `
            <div class="parent-context-icon" style="background: linear-gradient(135deg, #64748b 0%, #475569 100%);">
                <i class="fas fa-layer-group"></i>
            </div>
            <div class="parent-context-text">
                <span class="parent-context-label">Aktueller Kontext:</span>
                <span class="parent-context-headline">Feature Übersicht</span>
                <span class="parent-context-subheadline">Alle Vorteile auf einen Blick</span>
            </div>
            ${this.history.length > 0 ? `
            <button class="parent-context-back">
                <i class="fas fa-arrow-up"></i>
                Top
            </button>` : ''}
        `;

        if (this.history.length > 0) {
            // Make the whole root card clickable to go back to root
            rootCard.addEventListener('click', () => this.navigateToRoot());
            rootCard.style.cursor = 'pointer';
        } else {
            rootCard.style.cursor = 'default';
        }
        
        inner.appendChild(rootCard);

        // 2. History Contexts (Parent, Grandparent etc.)
        this.history.forEach((item, index) => {
            const parentNode = document.querySelector(`.tree-node[data-id="${item.nodeId}"]`);
            if (!parentNode) return;

            const icon = parentNode.querySelector('.node-icon i')?.className || 'fas fa-circle';
            const headline = parentNode.querySelector('.node-headline')?.textContent || '';
            const subheadline = parentNode.querySelector('.node-subheadline')?.textContent || '';

            const card = document.createElement('div');
            card.className = 'parent-context-card';
            
            // Removed manual positioning styles for breadcrumb layout
            
            card.innerHTML = `
                <div class="parent-context-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="parent-context-text">
                    <span class="parent-context-headline">${headline}</span>
                    <span class="parent-context-subheadline">${subheadline}</span>
                </div>
            `;

            // Click on card navigates to that level (exclusive, so we go TO this level, meaning its children become active)
            // Wait, if I click "Workflow Automation" in the breadcrumb, do I want to see Workflow Automation's children?
            // Yes. That is exactly state index 'index' in history?
            // No, history[index] is the state where we ARE inside that node.
            // Actually, if I am at Level 3, history has [Level 0 Choice, Level 1 Choice].
            // If I click Level 0 Choice (index 0), I want to go to the state where Level 0 Choice is the active parent (Level 1).
            // So target level index is item.levelIndex + 1? 
            // Let's look at navigateToCrumb logic.
            
            card.addEventListener('click', () => this.navigateToCrumb(index));

            inner.appendChild(card);
        });

        this.parentContext.classList.add('visible');
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
                this.previewLabel = node.querySelector('.node-headline')?.textContent || '';
                this.updateLevelStates();
            }
        }
    }

    handleNodeHoverEnd(node) {
        this.previewChildIndex = null;
        this.previewLabel = null;
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
        this.updateLevelStates();
        this.updateParentContext();
        this.backBtn.disabled = this.history.length === 0;
    }

    navigateToLevel(levelIndex) {
        this.currentLevelIndex = levelIndex;
        this.updateLevelStates();
        this.updateParentContext();
        this.backBtn.disabled = this.history.length === 0;
    }

    updateLevelStates() {
        // peek-left: das vorherige Level aus der History
        let peekLeftIndex = null;
        let leftTitle = '';

        if (this.history.length > 0) {
            const historyItem = this.history[this.history.length - 1];
            peekLeftIndex = historyItem.levelIndex;
            leftTitle = historyItem.label || 'Zurück';
        }

        // peek-right: das Level über dessen Node wir hovern
        const peekRightIndex = this.previewChildIndex;
        let rightTitle = '';
        if (this.previewChildIndex !== null) {
           // Find the node that triggered this preview
           // We can get it from the currently hovered node? 
           // Actually, previewChildIndex is set on hover.
           // We need the label of the node we are hovering over.
           // But updateLevelStates doesn't know about the hovered node directly.
           // We can store the label in `this.previewLabel` similar to previewChildIndex.
           rightTitle = this.previewLabel || 'Details';
        }

        this.levels.forEach((level, index) => {
            level.classList.remove('active', 'peek-left', 'peek-right', 'hidden');
            const titleEl = level.querySelector('.peek-overlay-title');

            if (index === this.currentLevelIndex) {
                level.classList.add('active');
            } else if (index === peekLeftIndex) {
                level.classList.add('peek-left');
                if (titleEl) titleEl.textContent = leftTitle;
            } else if (index === peekRightIndex) {
                level.classList.add('peek-right');
                if (titleEl) titleEl.textContent = rightTitle;
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
