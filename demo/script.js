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

// 标题鼠标打散效果
const heroTitle = document.getElementById('heroTitle');
if (heroTitle) {
  const originalText = heroTitle.textContent || '';
  const scatterRadius = 90;
  const scatterStrength = 18;
  heroTitle.textContent = '';

  [...originalText].forEach((char) => {
    const span = document.createElement('span');
    span.className = 'hero-letter';
    span.textContent = char === ' ' ? '\u00A0' : char;
    span.dataset.offsetX = (Math.random() * 2 - 1).toFixed(2);
    span.dataset.offsetY = (Math.random() * 2 - 1).toFixed(2);
    span.dataset.rotate = (Math.random() * 2 - 1).toFixed(2);
    heroTitle.appendChild(span);
  });

  const resetLetters = () => {
    heroTitle.querySelectorAll('.hero-letter').forEach((span) => {
      span.classList.remove('is-scattered');
      span.style.transform = '';
      span.style.opacity = '';
    });
  };

  heroTitle.addEventListener('mousemove', (event) => {
    heroTitle.querySelectorAll('.hero-letter').forEach((span) => {
      const rect = span.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);

      if (distance < scatterRadius) {
        const intensity = (scatterRadius - distance) / scatterRadius;
        const offsetX = parseFloat(span.dataset.offsetX) * scatterStrength * intensity;
        const offsetY = parseFloat(span.dataset.offsetY) * scatterStrength * intensity;
        const rotate = parseFloat(span.dataset.rotate) * intensity * 10;
        span.classList.add('is-scattered');
        span.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${rotate}deg)`;
        span.style.opacity = `${0.45 + (1 - intensity) * 0.45}`;
      } else {
        span.classList.remove('is-scattered');
        span.style.transform = '';
        span.style.opacity = '';
      }
    });
  });

  heroTitle.addEventListener('mouseleave', resetLetters);
}

// 动态粒子效果 + 彩色流线
const canvas = document.getElementById('particleCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const particleCount = 2000; // 高密度粒子
  const particles = [];
  const streaks = [];
  const pointer = { x: null, y: null, radius: 120 };
  const streakPalette = ['#7aa3ff', '#b880ff', '#50e3c2', '#ff7ad9', '#ffd36e'];
  let streakTimer = 0;
  const streakInterval = 40;

  // 1. 新增：速度衰减系数（核心），0.98-0.995最佳，越小衰减越快
  const speedDamping = 0.99; 
  // 2. 新增：粒子最小速度阈值（避免完全静止）
  const minSpeed = 0.05;

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
        vx: (Math.random() - 0.5) * 0.4, // 初始速度适度降低
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 1.7 + 0.8,
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
      width: 2.4 + Math.random() * 2.6,
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
      // 更新粒子位置
      particle.x += particle.vx;
      particle.y += particle.vy;

      // 边界反弹（保留）
      if (particle.x < 0 || particle.x > canvas.width) {
        particle.vx *= -1;
        // 反弹后也应用衰减，避免反弹后速度不变
        particle.vx *= speedDamping;
      }
      if (particle.y < 0 || particle.y > canvas.height) {
        particle.vy *= -1;
        particle.vy *= speedDamping;
      }

      // 鼠标交互（保留，力度微调）
      if (pointer.x !== null) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance < pointer.radius) {
          const force = (pointer.radius - distance) / pointer.radius;
          particle.vx += (dx / distance) * force * 0.15;
          particle.vy += (dy / distance) * force * 0.15;
        }
      }

      // 3. 核心：速度衰减（阻尼）
      particle.vx *= speedDamping;
      particle.vy *= speedDamping;

      // 4. 可选：防止粒子完全静止（低于最小速度时重置轻微随机速度）
      if (Math.abs(particle.vx) < minSpeed && Math.abs(particle.vy) < minSpeed) {
        particle.vx = (Math.random() - 0.5) * 0.2;
        particle.vy = (Math.random() - 0.5) * 0.2;
      }

      // 绘制粒子
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(122, 163, 255, 0.45)';
      ctx.fill();
    });

    // 彩色流线逻辑（无修改）
    streaks.forEach((streak, index) => {
      streak.x += streak.vx;
      streak.y += streak.vy;
      streak.life += 1;

      const progress = streak.life / streak.maxLife;
      const alpha = Math.max(0, Math.min(1, Math.sin(Math.PI * progress) * 0.75));

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

  // 初始化逻辑（补充完整）
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  createParticles();
  updateParticles();

  // 鼠标交互事件
  window.addEventListener('mousemove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  });
  window.addEventListener('mouseleave', () => {
    pointer.x = null;
    pointer.y = null;
  });
}
