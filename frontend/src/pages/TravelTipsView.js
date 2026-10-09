export class TravelTipsView {
  constructor(params) {
    this.params = params;
  }

  render() {
    const container = document.createElement('div');
    container.className = 'travel-tips-view';

    const tipsCategories = [
      {
        icon: "fa-suitcase-rolling",
        title: "Smart Packing & Luggage",
        tips: [
          "Roll clothes instead of folding to save 30% space and reduce wrinkles.",
          "Keep essential medications, passport, and one change of clothes in your personal carry-on item.",
          "Use packing cubes separated by outfit type or day.",
          "Always carry a universal multi-port adapter with USB-C PD fast charging."
        ]
      },
      {
        icon: "fa-money-bill-wave",
        title: "Budget & Currency Management",
        tips: [
          "Always pay in local currency when paying with credit card to avoid excessive dynamic conversion fees.",
          "Notify your bank before international travel or use fee-free travel cards like Wise/Revolut.",
          "Keep an emergency stash of local cash separated from your primary wallet.",
          "Download offline regional transit cards directly to your phone wallet before landing."
        ]
      },
      {
        icon: "fa-shield-halved",
        title: "Health & Safety Guidelines",
        tips: [
          "Take digital photos of your passport, visa, and insurance policy stored in an encrypted offline cloud.",
          "Check destination plug voltages and travel vaccination requirements at least 4 weeks prior.",
          "Save local emergency numbers and embassy contact details offline.",
          "Drink bottled water in destinations without potable tap water networks."
        ]
      },
      {
        icon: "fa-mobile-screen-button",
        title: "Digital & Tech Travel Tips",
        tips: [
          "Download offline Google Maps / Apple Maps areas for your destination before boarding flights.",
          "Install regional ride-hailing apps (Grab, Uber, Bolt, Gojek) ahead of arrival.",
          "Use Google Translate offline dictionary package for local language instant camera menus.",
          "Purchase an affordable international eSIM (Airalo, Holafly) before departure."
        ]
      }
    ];

    container.innerHTML = `
      <div style="margin-bottom: 28px;">
        <h2 style="font-size: 1.8rem; font-weight: 800; color: var(--color-navy); margin-bottom: 6px;">Travel Tips & Intelligence</h2>
        <p style="color: var(--color-muted); font-size: 0.95rem;">Curated advice, safety protocols, and packing wisdom to ensure smooth journeys.</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 24px;">
        ${tipsCategories.map(cat => `
          <div class="card">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <div style="width: 42px; height: 42px; border-radius: var(--radius-sm); background: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                <i class="fa-solid ${cat.icon}"></i>
              </div>
              <h3 style="font-size: 1.1rem; color: var(--color-navy);">${cat.title}</h3>
            </div>
            <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 12px;">
              ${cat.tips.map(tip => `
                <li style="font-size: 0.88rem; color: #334155; line-height: 1.45; display: flex; align-items: flex-start; gap: 10px;">
                  <i class="fa-solid fa-check" style="color: var(--color-success); margin-top: 3px; font-size: 0.85rem;"></i>
                  <span>${tip}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    `;

    return container;
  }
}
