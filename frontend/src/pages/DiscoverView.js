export class DiscoverView {
  constructor(params) {
    this.params = params;
  }

  render() {
    const container = document.createElement('div');
    container.className = 'discover-view';

    const destinations = [
      {
        name: "Kyoto, Japan",
        tagline: "Ancient temples, serene zen gardens & bamboo groves",
        image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80",
        season: "Spring & Autumn",
        budget: "$1,800 - $3,000",
        tags: ["Culture", "History", "Food"]
      },
      {
        name: "Amalfi Coast, Italy",
        tagline: "Dramatic seaside cliffs, pastel fishing villages & Mediterranean cuisine",
        image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80",
        season: "May - September",
        budget: "$2,500 - $4,500",
        tags: ["Beaches", "Food", "Relaxation"]
      },
      {
        name: "Reykjavík & South Coast, Iceland",
        tagline: "Glacier lagoons, volcanic landscapes & northern lights",
        image: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=600&q=80",
        season: "Year-round",
        budget: "$2,200 - $3,800",
        tags: ["Nature", "Adventure", "Photography"]
      },
      {
        name: "Santorini, Greece",
        tagline: "Whitewashed caldera villages, volcanic beaches & sunset views",
        image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80",
        season: "April - October",
        budget: "$2,000 - $3,500",
        tags: ["Relaxation", "Beaches", "Culture"]
      },
      {
        name: "Banff National Park, Canada",
        tagline: "Turquoise alpine lakes, towering peaks & wildlife trails",
        image: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=600&q=80",
        season: "June - September",
        budget: "$1,500 - $2,800",
        tags: ["Nature", "Adventure", "Hiking"]
      },
      {
        name: "Marrakech, Morocco",
        tagline: "Vibrant spice souks, historic palaces & Atlas Mountain excursions",
        image: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=600&q=80",
        season: "October - April",
        budget: "$900 - $1,800",
        tags: ["Culture", "History", "Food"]
      }
    ];

    container.innerHTML = `
      <div style="margin-bottom: 28px;">
        <h2 style="font-size: 1.8rem; font-weight: 800; color: var(--color-navy); margin-bottom: 6px;">Discover Destinations</h2>
        <p style="color: var(--color-muted); font-size: 0.95rem;">Handpicked travel inspirations curated by travel enthusiasts and AI trend analyses.</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
        ${destinations.map(d => `
          <div class="card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
            <div style="height: 190px; position: relative;">
              <img src="${d.image}" alt="${d.name}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
              <div style="position: absolute; top: 12px; right: 12px; background: rgba(15,23,42,0.75); color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">
                ${d.season}
              </div>
            </div>
            <div style="padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <h3 style="font-size: 1.15rem; color: var(--color-navy); margin-bottom: 6px;">${d.name}</h3>
                <p style="color: var(--color-muted); font-size: 0.85rem; line-height: 1.4; margin-bottom: 14px;">${d.tagline}</p>
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px;">
                  ${d.tags.map(t => `<span class="badge-pill">${t}</span>`).join('')}
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); padding-top: 14px;">
                <span style="font-size: 0.82rem; color: var(--color-muted);">Est. Budget: <strong>${d.budget}</strong></span>
                <button class="outline-btn-sm" data-dest="${d.name}">Plan Trip</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.outline-btn-sm').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const destination = e.currentTarget.getAttribute('data-dest');
        window.navigateTo(`/plan?destination=${encodeURIComponent(destination)}`);
      });
    });

    return container;
  }
}
