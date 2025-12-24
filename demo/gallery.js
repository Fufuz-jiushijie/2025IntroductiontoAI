const galleryGrid = document.getElementById('galleryGrid');
const galleryEmpty = document.getElementById('galleryEmpty');
const clearGalleryButton = document.getElementById('clearGallery');

const storageKey = 'generatedImages';

function renderGallery() {
  if (!galleryGrid || !galleryEmpty) {
    return;
  }

  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  galleryGrid.innerHTML = '';

  if (saved.length === 0) {
    galleryEmpty.classList.remove('hidden');
    return;
  }

  galleryEmpty.classList.add('hidden');

  saved
    .slice()
    .reverse()
    .forEach((item) => {
      const card = document.createElement('article');
      card.className = 'gallery-card';

      const image = document.createElement('img');
      image.src = `data:image/png;base64,${item.imageBase64}`;
      image.alt = item.prompt;

      const info = document.createElement('div');
      info.className = 'gallery-info';

      const title = document.createElement('h3');
      title.textContent = item.prompt;

      const meta = document.createElement('p');
      meta.textContent = `尺寸 ${item.width}x${item.height} · 步数 ${item.steps}`;

      const extra = document.createElement('p');
      extra.textContent = item.negativePrompt
        ? `负提示词：${item.negativePrompt}`
        : '负提示词：无';

      const time = document.createElement('span');
      const date = new Date(item.createdAt);
      time.textContent = `生成时间：${date.toLocaleString()}`;

      info.append(title, meta, extra, time);
      card.append(image, info);
      galleryGrid.appendChild(card);
    });
}

if (clearGalleryButton) {
  clearGalleryButton.addEventListener('click', () => {
    localStorage.removeItem(storageKey);
    renderGallery();
  });
}

renderGallery();