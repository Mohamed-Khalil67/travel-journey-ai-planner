export class NotFoundView {
  constructor(params) {
    this.params = params;
  }

  render() {
    const container = document.createElement('div');
    container.className = 'card';
    container.style.textAlign = 'center';
    container.style.padding = '60px 20px';

    container.innerHTML = `
      <i class="fa-solid fa-compass" style="font-size: 3.5rem; color: #94a3b8; margin-bottom: 20px;"></i>
      <h2 style="font-size: 2rem; margin-bottom: 12px; color: #0f172a;">404 - Page Not Found</h2>
      <p style="color: #64748b; margin-bottom: 24px;">The page or destination you are looking for does not exist.</p>
      <button data-route="/"><i class="fa-solid fa-house"></i> Return Home</button>
    `;

    return container;
  }
}
