export function openHelp(): void {
  if (document.getElementById('help-dialog')) return;

  const dialog = document.createElement('div');
  dialog.id = 'help-dialog';
  dialog.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:100;">
      <div style="background:#1e1e30;padding:20px;border-radius:12px;max-width:min(90%,420px);color:#e8e8f0;line-height:1.55;font-size:0.95rem;">
        <h2 style="margin-top:0;font-size:1.25rem;">How to play Sightline</h2>
        <p><strong>Goal:</strong> Shade cells black so every numbered cell sees exactly its number of white cells in the four cardinal directions.</p>
        <ul style="padding-left:18px;margin:8px 0;">
          <li>Shaded (black) cells cannot touch orthogonally.</li>
          <li>All white cells must connect orthogonally.</li>
          <li>Numbers show how many white cells are visible in a line until a black cell or the grid edge blocks the view.</li>
        </ul>
        <p><strong>Controls:</strong></p>
        <ul style="padding-left:18px;margin:8px 0;">
          <li>Tap a cell to cycle: unknown → white → black → unknown.</li>
          <li>Numbered cells are always white and cannot be changed.</li>
          <li>Long-press a numbered cell to highlight its four sightlines.</li>
          <li>Tap <em>Sightlines</em> to show current count vs target on every number.</li>
        </ul>
        <button id="close-help" class="btn btn-primary" style="margin-top:10px;width:100%">Close</button>
      </div>
    </div>
  `;
  dialog.querySelector('#close-help')?.addEventListener('click', () => dialog.remove());
  document.body.appendChild(dialog);
}

export function closeHelp(): void {
  document.getElementById('help-dialog')?.remove();
}
