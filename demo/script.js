// 导航栏粘性效果
const nav = document.querySelector('.nav');
if (nav) {
  window.addEventListener('scroll', fixNav);
}

function fixNav() {
  if (window.scrollY > nav.offsetHeight + 150) {
    nav.classList.add('active');
  } else {
    nav.classList.remove('active');
  }
}

const generateBtn = document.getElementById('generateBtn');
const loading = document.getElementById('loading');
const statusMessage = document.getElementById('statusMessage');
const inspireToggle = document.getElementById('inspireToggle');
const inspirePanel = document.getElementById('inspirePanel');

const storageKey = 'generatedImages';

if (inspireToggle && inspirePanel) {
  inspireToggle.addEventListener('click', () => {
    inspirePanel.classList.toggle('hidden');
    inspireToggle.classList.toggle('is-open');
  });
}

async function generateImage() {
  const promptInput = document.getElementById('prompt');
  const negativePromptInput = document.getElementById('negativePrompt');
  const sizeInput = document.getElementById('size');
  const stepsInput = document.getElementById('steps');

  if (!promptInput || !negativePromptInput || !sizeInput || !stepsInput) {
    return;
  }

  const prompt = promptInput.value.trim();
  if (!prompt) {
    alert('请输入提示词！');
    return;
  }

  const sizeStr = sizeInput.value.trim();
  const sizeArr = sizeStr.split('x');
  if (sizeArr.length !== 2) {
    alert('尺寸格式错误！请输入如512x512的格式');
    return;
  }
  const width = parseInt(sizeArr[0], 10);
  const height = parseInt(sizeArr[1], 10);
  if (Number.isNaN(width) || Number.isNaN(height)) {
    alert('尺寸必须是数字！');
    return;
  }

  const steps = parseInt(stepsInput.value, 10);
  if (Number.isNaN(steps) || steps < 1) {
    alert('采样步数必须大于0！');
    return;
  }

  if (generateBtn) {
    generateBtn.disabled = true;
  }
  if (loading) {
    loading.style.display = 'block';
  }
  if (statusMessage) {
    statusMessage.classList.add('hidden');
  }

  try {
    const response = await fetch('http://localhost:8000/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        negative_prompt: negativePromptInput.value.trim(),
        width: width,
        height: height,
        steps: steps,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || '生成失败');
    }

    const data = await response.json();

    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    saved.push({
      prompt,
      negativePrompt: negativePromptInput.value.trim(),
      width,
      height,
      steps,
      imageBase64: data.image_base64,
      createdAt: Date.now(),
    });
    localStorage.setItem(storageKey, JSON.stringify(saved));

    if (statusMessage) {
      statusMessage.textContent = '生成完成，内容已保存到生成库！';
      statusMessage.classList.remove('hidden');
    }
  } catch (error) {
    alert(error.message);
  } finally {
    if (generateBtn) {
      generateBtn.disabled = false;
    }
    if (loading) {
      loading.style.display = 'none';
    }
  }
}

// 滚动渐入效果
const fadeElements = document.querySelectorAll(
  '.generate-card, .input-area, .input-textarea, .generate-btn, .preview-area, .preview-box'
);

if (fadeElements.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
        } else {
          entry.target.classList.remove('fade-in');
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    }
  );

  fadeElements.forEach((element) => {
    observer.observe(element);
  });
}

// 标题鼠标形变
const heroTitle = document.getElementById('heroTitle');
if (heroTitle) {
  heroTitle.addEventListener('mousemove', (event) => {
    const rect = heroTitle.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width - 0.5;
    const relY = (event.clientY - rect.top) / rect.height - 0.5;
    const pressX = relX * 12;
    const pressY = relY * 8;
    const scale = 1 - Math.abs(relY) * 0.08;

    heroTitle.style.setProperty('--press-x', `${pressX}px`);
    heroTitle.style.setProperty('--press-y', `${pressY}px`);
    heroTitle.style.setProperty('--press-scale', scale.toFixed(3));
    heroTitle.classList.add('is-pressed');
  });

  heroTitle.addEventListener('mouseleave', () => {
    heroTitle.style.setProperty('--press-x', '0px');
    heroTitle.style.setProperty('--press-y', '0px');
    heroTitle.style.setProperty('--press-scale', '1');
    heroTitle.classList.remove('is-pressed');
  });
}

// 动态粒子效果 + 彩色流线
const canvas = document.getElementById('particleCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const particleCount = 90;
  const particles = [];
  const streaks = [];
  const pointer = { x: null, y: null, radius: 120 };
  const streakPalette = ['#7aa3ff', '#b880ff', '#50e3c2', '#ff7ad9', '#ffd36e'];
  let streakTimer = 0;
  const streakInterval = 40;

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  const createParticles = () => {
    particles.length = 0;
    for (let i = 0; i < particleCount; i += 1) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: Math.random() * 2 + 1,
      });
    }
  };

  const spawnStreak = () => {
    const startX = Math.random() * canvas.width;
    const startY = Math.random() * canvas.height * 0.6;
    const angle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25;
    const speed = 4 + Math.random() * 4;
    streaks.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 120 + Math.random() * 80,
      width: 2 + Math.random() * 2,
      color: streakPalette[Math.floor(Math.random() * streakPalette.length)],
    });
  };

  const updateParticles = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    streakTimer += 1;
    if (streakTimer >= streakInterval) {
      streakTimer = 0;
      spawnStreak();
    }

    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < 0 || particle.x > canvas.width) {
        particle.vx *= -1;
      }
      if (particle.y < 0 || particle.y > canvas.height) {
        particle.vy *= -1;
      }

      if (pointer.x !== null) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance < pointer.radius) {
          const force = (pointer.radius - distance) / pointer.radius;
          particle.vx += (dx / distance) * force * 0.3;
          particle.vy += (dy / distance) * force * 0.3;
        }
      }

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(122, 163, 255, 0.45)';
      ctx.fill();
    });

    streaks.forEach((streak, index) => {
      streak.x += streak.vx;
      streak.y += streak.vy;
      streak.life += 1;

      const progress = streak.life / streak.maxLife;
      const alpha = Math.max(0, Math.min(1, Math.sin(Math.PI * progress) * 0.6));

      const gradient = ctx.createLinearGradient(
        streak.x,
        streak.y,
        streak.x - streak.vx * 8,
        streak.y - streak.vy * 8
      );
      gradient.addColorStop(0, `${streak.color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = streak.width;
      ctx.beginPath();
      ctx.moveTo(streak.x, streak.y);
      ctx.lineTo(streak.x - streak.vx * 8, streak.y - streak.vy * 8);
      ctx.stroke();

      if (streak.life > streak.maxLife) {
        streaks.splice(index, 1);
      }
    });

    requestAnimationFrame(updateParticles);
  };

  resizeCanvas();
  createParticles();
  updateParticles();

  window.addEventListener('resize', () => {
    resizeCanvas();
    createParticles();
  });

  window.addEventListener('mousemove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });

  window.addEventListener('mouseout', () => {
    pointer.x = null;
    pointer.y = null;
  });
}
