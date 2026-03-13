const API_BASE = 'https://db.ygoprodeck.com/api/v7';

async function fetchStructureDecks() {
    try {
        const response = await fetch(`${API_BASE}/cardsets.php`);
        const sets = await response.json();
        return sets.filter(set => set.set_name.toLowerCase().includes('structure deck'));
    } catch (error) {
        console.error('Error fetching structure decks:', error);
        return [];
    }
}

async function fetchDeckCards(setName) {
    // Find the deck in our cached allStructureDecks to check its release date and expected card count
    const deckInfo = allStructureDecks.find(d => d.set_name === setName);
    let isNewSet = false;
    let expectedCount = 0;

    if (deckInfo) {
        expectedCount = deckInfo.num_of_cards || 0;
        if (deckInfo.tcg_date) {
            const releaseDate = new Date(deckInfo.tcg_date);
            const today = new Date();
            const diffTime = Math.abs(today - releaseDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // If the set came out within the last 60 days, YGOPRODeck's ?set= endpoint usually 400s
            // because the individual cards haven't been fully indexed to the set string yet.
            if (diffDays <= 60) {
                isNewSet = true;
                console.log(`"${setName}" is a recent set (released ${diffDays} days ago). Skipping direct ?set= API variations to prevent 400 errors.`);
            }
        }
    }

    if (!isNewSet) {
        const variations = [
            setName,
            setName.includes(':') ? setName.replace(':', '') : null,
            setName.includes('Structure Deck: ') ? setName.replace('Structure Deck: ', '') : null,
            !setName.includes('(TCG)') ? `${setName} (TCG)` : null
        ].filter(v => v !== null && v !== '');

        for (const variant of variations) {
            try {
                console.log(`Trying set fetch for: "${variant}"`);
                const response = await fetch(`${API_BASE}/cardinfo.php?set=${encodeURIComponent(variant)}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.data && data.data.length > 0) {
                        // CRITICAL FIX: Verify the card count matches what we expect from the cardsets.php list.
                        // This prevents picking up old sets with similar names (e.g. "Fire Kings" matching the 2013 deck).
                        if (expectedCount > 0 && Math.abs(data.data.length - expectedCount) > 5) {
                            console.warn(`Variant "${variant}" returned ${data.data.length} cards, but we expected ~${expectedCount}. Skipping as potential false match.`);
                            continue;
                        }
                        console.log(`Successfully fetched ${data.data.length} cards for set variant: "${variant}"`);
                        return data.data;
                    }
                }
            } catch (error) {
                console.warn(`Error fetching variant "${variant}":`, error);
            }
        }
    }

    // Fallback: If all set endpoints fail (or if it's a known new set like Blue-Eyes White Destiny),
    // fetch all cards and filter by card_sets manually.
    console.warn(`All set endpoint variations failed or were incorrect for: ${setName}. Attempting full database fallback...`);
    try {
        const response = await fetch(`${API_BASE}/cardinfo.php`);
        if (response.ok) {
            const data = await response.json();
            const setCards = data.data.filter(card => 
                card.card_sets && card.card_sets.some(s => s.set_name === setName)
            );
            if (setCards.length > 0) {
                console.log(`Successfully fetched ${setCards.length} cards using full database fallback for set: "${setName}"`);
                return setCards;
            }
        }
    } catch (fallbackError) {
        console.error("Full database fallback failed:", fallbackError);
    }

    console.error(`Failed to find cards for set: ${setName} even with fallback.`);
    return [];
}

function getCardType(card) {
    const type = card.type.toLowerCase();
    const frame = card.frameType ? card.frameType.toLowerCase() : '';
    
    if (type.includes('spell')) return 'Spell';
    if (type.includes('trap')) return 'Trap';
    
    // Check for Extra Deck frames
    const extraFrames = ['fusion', 'synchro', 'xyz', 'link'];
    if (extraFrames.some(f => frame.includes(f))) return 'Extra';
    
    if (type.includes('monster')) return 'Monster';
    return 'Other';
}

const elements = {
    deckSelect: document.getElementById('structure-deck-select'),
    deckMultiplier: document.getElementById('structure-deck-multiplier'),
    myDecklist: document.getElementById('my-decklist'),
    myCollection: document.getElementById('my-collection'),
    compareBtn: document.getElementById('compare-btn'),
    resultsSection: document.getElementById('results'),
    missingList: document.getElementById('missing-list'),
    missingTextView: document.getElementById('missing-text-view'),
    statMissing: document.getElementById('stat-missing'),
    barMonster: document.getElementById('bar-monster'),
    barSpell: document.getElementById('bar-spell'),
    barTrap: document.getElementById('bar-trap'),
    statRatioText: document.getElementById('stat-ratio-text'),
    statCost: document.getElementById('stat-cost'),
    exportBtn: document.getElementById('export-btn'),
    viewToggleBtn: document.getElementById('view-toggle-btn'),
    tooltip: document.getElementById('card-tooltip'),
    tooltipImg: document.getElementById('tooltip-img'),
    tooltipName: document.getElementById('tooltip-name'),
    tooltipDesc: document.getElementById('tooltip-desc')
};

let allStructureDecks = [];
let currentMissingCards = [];
let isTextView = false;

async function init() {
    // Load collection from local storage
    const savedCollection = localStorage.getItem('ygo-deck-collection');
    if (savedCollection) {
        document.getElementById('my-collection').value = savedCollection;
    }

    allStructureDecks = await fetchStructureDecks();
    
    elements.deckSelect.innerHTML = '<option value="">-- Choose a Structure Deck --</option>';
    allStructureDecks.forEach(deck => {
        const option = document.createElement('option');
        option.value = deck.set_name;
        option.textContent = deck.set_name;
        elements.deckSelect.appendChild(option);
    });

    elements.compareBtn.addEventListener('click', handleCompare);
    elements.exportBtn.addEventListener('click', handleExport);
    elements.viewToggleBtn.addEventListener('click', handleViewToggle);

    // Save collection on input
    document.getElementById('my-collection').addEventListener('input', (e) => {
        localStorage.setItem('ygo-deck-collection', e.target.value);
    });
}

function handleViewToggle() {
    isTextView = !isTextView;
    
    if (isTextView) {
        elements.viewToggleBtn.innerText = 'Show Card View';
        elements.missingList.classList.add('hidden');
        elements.missingTextView.classList.remove('hidden');
    } else {
        elements.viewToggleBtn.innerText = 'Show Text View';
        elements.missingTextView.classList.add('hidden');
        elements.missingList.classList.remove('hidden');
    }
}

function parseUserDecklist(text) {
    const lines = text.split('\n');
    const deck = {};
    
    lines.forEach(line => {
        const trimmed = line.trim();
        
        // Skip empty lines, comments, and section headers
        if (
            trimmed === '' || 
            trimmed.startsWith('//') || 
            (trimmed.startsWith('==') && trimmed.endsWith('==')) ||
            ['main deck', 'extra deck', 'side deck'].includes(trimmed.toLowerCase())
        ) {
            return;
        }

        const match = trimmed.match(/^(?:(\d+)\s*[xX]?\s+)?(.+)$/);
        if (match) {
            const qty = parseInt(match[1]) || 1;
            const name = match[2].trim().toLowerCase();
            deck[name] = (deck[name] || 0) + qty;
        }
    });
    
    return deck;
}

async function handleCompare() {
    const selectedSetName = elements.deckSelect.value;
    const multiplier = parseInt(elements.deckMultiplier.value) || 1;
    const userDeckText = elements.myDecklist.value;
    const collectionText = elements.myCollection.value;

    if (!selectedSetName || !userDeckText.trim()) {
        alert('Please select a structure deck and paste your list.');
        return;
    }

    if (multiplier < 1) {
        alert('Multiplier must be at least 1.');
        return;
    }

    elements.compareBtn.innerText = 'Analyzing Cards...';
    elements.compareBtn.disabled = true;

    try {
        const structureCards = await fetchDeckCards(selectedSetName);
        const userDeck = parseUserDecklist(userDeckText);
        const collectionDeck = parseUserDecklist(collectionText);
        
        if (!structureCards || structureCards.length === 0) {
            throw new Error(`Could not find any cards for the structure deck: ${selectedSetName}`);
        }

        const structureMap = {};
        const nameToCardInfo = {};

        structureCards.forEach(card => {
            const lowerName = card.name.toLowerCase();
            const setEntry = card.card_sets.find(s => s.set_name === selectedSetName);
            const countInSet = setEntry ? (setEntry.set_quantity || 1) : 1;
            
            structureMap[lowerName] = (structureMap[lowerName] || 0) + (countInSet * multiplier);
            nameToCardInfo[lowerName] = card;
        });

        const missing = [];
        let totalMissing = 0;
        let ratios = { Monster: 0, Spell: 0, Trap: 0, Extra: 0, Other: 0 };

        const externalLookupNames = [];
        for (const [name, qty] of Object.entries(userDeck)) {
            if (!nameToCardInfo[name]) {
                externalLookupNames.push(name);
            }
        }

        if (externalLookupNames.length > 0) {
            // Batch process external lookups to avoid too many requests
            const chunkSize = 30;
            for (let i = 0; i < externalLookupNames.length; i += chunkSize) {
                const chunk = externalLookupNames.slice(i, i + chunkSize);
                try {
                    const response = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(chunk.join('|'))}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.data) {
                            data.data.forEach(card => {
                                nameToCardInfo[card.name.toLowerCase()] = card;
                            });
                        }
                    }
                } catch (e) {
                    console.warn(`Could not find card info for chunk started with: ${chunk[0]}`);
                }
            }
        }

        for (const [name, qty] of Object.entries(userDeck)) {
            const hasFromStructure = structureMap[name] || 0;
            const hasFromCollection = collectionDeck[name] || 0;
            const totalHas = hasFromStructure + hasFromCollection;
            const info = nameToCardInfo[name];
            
            if (totalHas < qty) {
                const diff = qty - totalHas;
                const type = info ? getCardType(info) : 'Other';
                
                // Extract price
                let price = 0;
                if (info && info.card_prices && info.card_prices.length > 0) {
                    price = parseFloat(info.card_prices[0].tcgplayer_price) || 0;
                }

                // Extract image and description for tooltip
                let imageUrl = '';
                if (info && info.card_images && info.card_images.length > 0) {
                    imageUrl = info.card_images[0].image_url;
                }

                missing.push({ 
                    name: info?.name || name, 
                    desc: info?.desc || 'No description available.',
                    qty: diff,
                    frameType: info?.frameType || 'normal',
                    type: type,
                    price: price,
                    imageUrl: imageUrl
                });
                totalMissing += diff;
            }

            if (info) {
                const type = getCardType(info);
                ratios[type] += qty;
            }
        }

        renderResults(missing, totalMissing, ratios);
    } catch (error) {
        console.error('Comparison Error:', error);
        alert(`Error: ${error.message || 'Something went wrong during comparison.'}`);
    } finally {
        elements.compareBtn.innerText = 'Compare Decks';
        elements.compareBtn.disabled = false;
    }
}

function updateMissingTextView() {
    if (currentMissingCards.length === 0) {
        elements.missingTextView.value = "You have all the cards needed from this structure deck!";
    } else {
        const lines = currentMissingCards.map(c => `${c.qty}x ${c.name}`);
        elements.missingTextView.value = lines.join('\n');
    }
}

function renderResults(missing, totalMissing, ratios, totalCost = null) {
    currentMissingCards = missing;
    
    elements.resultsSection.classList.remove('hidden');
    elements.missingList.innerHTML = '';
    
    if (totalMissing !== null) {
        elements.statMissing.textContent = totalMissing;
    }
    
    if (ratios !== null && ratios !== undefined) {
        // Update ratios object for easier use
        const m = ratios.Monster || 0;
        const s = ratios.Spell || 0;
        const t = ratios.Trap || 0;
        
        elements.statRatioText.textContent = `(${m}/${s}/${t})`;
        
        let totalMain = m + s + t;
        if (totalMain > 0) {
            elements.barMonster.style.width = `${(m / totalMain) * 100}%`;
            elements.barMonster.title = `Monsters: ${m}`;
            
            elements.barSpell.style.width = `${(s / totalMain) * 100}%`;
            elements.barSpell.title = `Spells: ${s}`;
            
            elements.barTrap.style.width = `${(t / totalMain) * 100}%`;
            elements.barTrap.title = `Traps: ${t}`;
        } else {
            elements.barMonster.style.width = '0%';
            elements.barSpell.style.width = '0%';
            elements.barTrap.style.width = '0%';
        }
    }

    if (totalCost === null) {
        // Recalculate cost if not provided
        totalCost = missing.reduce((sum, item) => sum + (item.price * item.qty), 0);
    }
    elements.statCost.textContent = `$${totalCost.toFixed(2)}`;

    updateMissingTextView();

    if (missing.length === 0) {
        elements.exportBtn.classList.add('hidden');
        elements.viewToggleBtn.classList.add('hidden');
        elements.missingList.innerHTML = '<div class="status-msg success">✨ You have all the cards needed from this structure deck!</div>';
    } else {
        elements.exportBtn.classList.remove('hidden');
        elements.viewToggleBtn.classList.remove('hidden');
        
        // Segregate into Main Deck and Extra Deck
        const extraDeckTypes = ['fusion', 'synchro', 'xyz', 'link'];
        const mainDeckItems = [];
        const extraDeckItems = [];
        
        missing.forEach(item => {
            const ft = item.frameType ? item.frameType.toLowerCase() : 'normal';
            // Specific string check for extra deck variations and tokens
            if (extraDeckTypes.includes(ft) || ft.includes('fusion') || ft.includes('synchro') || ft.includes('xyz') || ft.includes('link')) {
                extraDeckItems.push(item);
            } else if (ft !== 'token') {
                mainDeckItems.push(item);
            }
        });

        const renderCard = (item, index) => {
            const div = document.createElement('div');
            div.className = 'missing-card-item';
            div.setAttribute('data-frame-type', item.frameType || 'normal');
            
            const itemTotal = (item.price * item.qty).toFixed(2);
            const priceHtml = item.price > 0 ? `<span class="item-price">$${itemTotal}</span>` : `<span class="item-price">N/A</span>`;
            
            div.innerHTML = `
                <div class="card-info" data-index="${index}">
                    <span class="card-qty">x${item.qty}</span>
                    <span class="card-name">${item.name}</span>
                </div>
                <div>
                    ${priceHtml}
                    <button class="remove-card-btn" data-index="${index}" title="Remove this card">&times;</button>
                </div>
            `;
            elements.missingList.appendChild(div);
        };

        if (mainDeckItems.length > 0) {
            const header = document.createElement('h4');
            header.className = 'deck-section-title';
            header.textContent = 'Main Deck';
            elements.missingList.appendChild(header);
            
            mainDeckItems.forEach(item => {
                const globalIndex = currentMissingCards.findIndex(c => c.name === item.name);
                renderCard(item, globalIndex);
            });
        }

        if (extraDeckItems.length > 0) {
            const header = document.createElement('h4');
            header.className = 'deck-section-title';
            header.textContent = 'Extra Deck';
            elements.missingList.appendChild(header);
            
            extraDeckItems.forEach(item => {
                const globalIndex = currentMissingCards.findIndex(c => c.name === item.name);
                renderCard(item, globalIndex);
            });
        }

        // Add event listeners tracking the DOM buttons to remove cards
        document.querySelectorAll('.remove-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                removeCard(index);
            });
        });

        // Add event listeners for tooltip
        document.querySelectorAll('.card-info').forEach(infoDiv => {
            infoDiv.addEventListener('mouseenter', handleTooltipEnter);
            infoDiv.addEventListener('mousemove', handleTooltipMove);
            infoDiv.addEventListener('mouseleave', handleTooltipLeave);
        });
    }

    elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function removeCard(index) {
    if (index >= 0 && index < currentMissingCards.length) {
        const removedItem = currentMissingCards[index];
        currentMissingCards.splice(index, 1);
        
        let newTotalMissing = parseInt(elements.statMissing.textContent) - removedItem.qty;
        
        // Re-calculate ratios from current text safely
        const ratioTextMatch = elements.statRatioText.textContent.match(/\((\d+)\/(\d+)\/(\d+)\)/);
        let newRatios = null;
        
        if (ratioTextMatch) {
            let m = parseInt(ratioTextMatch[1]);
            let s = parseInt(ratioTextMatch[2]);
            let t = parseInt(ratioTextMatch[3]);
            
            const type = removedItem.type;
            if (type === 'Monster') m -= removedItem.qty;
            if (type === 'Spell') s -= removedItem.qty;
            if (type === 'Trap') t -= removedItem.qty;
            
            newRatios = { Monster: m, Spell: s, Trap: t };
        }
        
        updateMissingTextView();
        renderResults(currentMissingCards, newTotalMissing, newRatios); 
    }
}

// Tooltip Handlers
function handleTooltipEnter(e) {
    const index = parseInt(e.currentTarget.getAttribute('data-index'));
    const item = currentMissingCards[index];
    
    if (item) {
        if (item.imageUrl) {
            elements.tooltipImg.src = item.imageUrl;
            elements.tooltipImg.style.display = 'block';
        } else {
            elements.tooltipImg.style.display = 'none';
        }
        
        elements.tooltipName.textContent = item.name;
        elements.tooltipDesc.textContent = item.desc;
        elements.tooltip.classList.remove('hidden');
    }
}

function handleTooltipMove(e) {
    // Position the tooltip near the cursor, keeping it in viewport bounds
    let x = e.clientX + 20;
    let y = e.clientY + 20;
    
    const tooltipRect = elements.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Prevent clipping on right side
    if (x + tooltipRect.width > viewportWidth) {
        x = e.clientX - tooltipRect.width - 20;
    }
    
    // Prevent clipping on bottom
    if (y + tooltipRect.height > viewportHeight) {
        y = viewportHeight - tooltipRect.height - 20;
    }
    
    elements.tooltip.style.left = `${x}px`;
    elements.tooltip.style.top = `${y}px`;
}

function handleTooltipLeave() {
    elements.tooltip.classList.add('hidden');
}

async function handleExport() {
    if (currentMissingCards.length === 0) return;

    const lines = currentMissingCards.map(c => `${c.qty}x ${c.name}`);
    const textContent = lines.join('\n');
    
    try {
        await navigator.clipboard.writeText(textContent);
        const originalText = elements.exportBtn.innerText;
        elements.exportBtn.innerText = 'Copied!';
        elements.exportBtn.style.background = 'var(--accent-glow)';
        setTimeout(() => {
            elements.exportBtn.innerText = originalText;
            elements.exportBtn.style.background = '';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy to clipboard. Logged to console.');
    }
}

init();
