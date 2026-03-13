# Yu-Gi-Oh! Deck Comparison Tool

A premium, web-based tool designed to help Duelists optimize their deck building by comparing their target decklists against Yu-Gi-Oh! Structure Decks. Instantly identify missing cards, calculate collection costs, and visualize your deck's composition.

![Yu-Gi-Oh! Dueling Aesthetic](https://images.ygoprodeck.com/images/sets/SDWD.jpg)

## ✨ Key Features

- **Structure Deck Integration**: Select from any official TCG Structure Deck. The tool automatically fetches card lists, including support for brand-new releases.
- **Smart Comparison**: Paste your target decklist and optionally your existing collection. The app calculates exactly what you need to acquire.
- **Premium UI/UX**:
    - **Master Duel Aesthetic**: Dark-themed, holographic interface with metallic gold accents.
    - **Card Art Tooltips**: Hover over any missing card to see its artwork, type, and full effect description.
    - **Deck Sorting**: Automatically separates missing cards into **Main Deck** and **Extra Deck** categories.
    - **Interactive Stats**: Real-time tracking of "Total Missing" cards and total estimated cost.
- **Dynamic Cost Tracking**: Integrates live **TCGPlayer pricing** data to show the estimated cost for individual cards and the entire missing list.
- **Visual Composition**: A color-coded breakdown bar showing the ratio of Monsters, Spells, and Traps in your missing cards list.
- **Quick Copy & Toggle**: Seamlessly switch between a visual card list and a raw text view. Copy your final results to your clipboard with one click.
- **Persistent Progress**: Your "Already Owned" card list is saved to your browser's local storage automatically.

## 🚀 Getting Started

Simply open `index.html` in any modern web browser or host it on a static hosting service like GitHub Pages.

### How to use:
1. **Choose a Structure Deck**: Select the deck you are basing your build on.
2. **Set Multiplier**: Specify how many copies of that structure deck you have/plan to buy (e.g., 3x).
3. **Paste Target Decklist**: Add the list of cards you want to end up with.
4. **Paste Your Collection (Optional)**: Add any cards you already own to subtract them from the missing list.
5. **Compare**: Hit "Compare Decks" to see your results!

## 🛠️ Built With

- **Vanilla JavaScript (ES6+)**
- **HTML5 & CSS3** (Custom UI System)
- **YGOPRODeck API**: For card data, images, and live pricing.
- **Google Fonts**: Cinzel, Outfit, and JetBrains Mono.

## 🌐 Deployment

This project is fully compatible with **GitHub Pages**. To deploy:
1. Push these files to a GitHub repository.
2. Navigate to **Settings > Pages**.
3. Set the build branch to `main` and click **Save**.

---
*Developed as a thematic utility for the Yu-Gi-Oh! community.*