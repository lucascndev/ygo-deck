const API_BASE = 'https://db.ygoprodeck.com/api/v7';

export async function fetchStructureDecks() {
    try {
        // Since there is no direct endpoint for "structure decks", 
        // we can fetch the card sets and filter for "Structure Deck"
        const response = await fetch(`${API_BASE}/cardsets.php`);
        const sets = await response.json();
        return sets.filter(set => set.set_name.toLowerCase().includes('structure deck'));
    } catch (error) {
        console.error('Error fetching structure decks:', error);
        return [];
    }
}

export async function fetchDeckCards(setName) {
    try {
        const response = await fetch(`${API_BASE}/cardinfo.php?set=${encodeURIComponent(setName)}`);
        const data = await response.json();
        return data.data; // Array of card objects
    } catch (error) {
        console.error(`Error fetching cards for set ${setName}:`, error);
        return [];
    }
}

// Helper to get card type summary
export function getCardType(card) {
    const type = card.type.toLowerCase();
    if (type.includes('monster')) return 'Monster';
    if (type.includes('spell')) return 'Spell';
    if (type.includes('trap')) return 'Trap';
    return 'Other';
}
