// 核心：全局DOM加载完成后执行（避免元素未渲染就操作）
document.addEventListener('DOMContentLoaded', function() {
  // 导航栏粘性效果（当前页面无导航栏，预留逻辑）
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', fixNav);
    
    function fixNav() {
      if (window.scrollY > nav.offsetHeight + 150) {
        nav.classList.add('active');
      } else {
        nav.classList.remove('active');
      }
    }
  }

  // ========== 图片生成核心逻辑 ==========
  const generateBtn = document.getElementById('generateBtn');
  const loading = document.getElementById('loading');
  const statusMessage = document.getElementById('statusMessage');
  const storageKey = 'generatedImages'; // 本地存储生成图片元数据的key

  /**
   * 生成图片核心函数
   * 1. 校验输入参数
   * 2. 调用后端接口生成图片
   * 3. 存储图片元数据到localStorage
   */
  async function generateImage() {
    const promptInput = document.getElementById('prompt');
    const negativePromptInput = document.getElementById('negativePrompt');
    const sizeInput = document.getElementById('size');
    const stepsInput = document.getElementById('steps');

    // 元素存在性校验
    if (!promptInput || !negativePromptInput || !sizeInput || !stepsInput) {
      alert('页面元素加载异常，请刷新重试！');
      return;
    }

    // 提示词非空校验
    const prompt = promptInput.value.trim();
    if (!prompt) {
      alert('请输入提示词！');
      return;
    }

    // 尺寸格式校验（必须是 数字x数字 格式）
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

    // 采样步数校验（必须大于0）
    const steps = parseInt(stepsInput.value, 10);
    if (Number.isNaN(steps) || steps < 1) {
      alert('采样步数必须大于0！');
      return;
    }

    // 按钮状态切换：禁用+显示加载
    if (generateBtn) generateBtn.disabled = true;
    if (loading) loading.style.display = 'block';
    if (statusMessage) statusMessage.classList.add('hidden');

    try {
      // 调用后端生成图片接口
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

      // 接口异常处理
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || '生成失败');
      }

      const data = await response.json();

      // 存储图片元数据到localStorage（仅存元数据，避免base64超限）
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const newImageMeta = {
        prompt,
        negativePrompt: negativePromptInput.value.trim(),
        width,
        height,
        steps,
        filename: data.filename, // 仅存文件名，不存base64
        url: data.url,
        createdAt: Date.now(),
      };
      
      // 去重 + 限制存储数量（最多20条）
      const filteredSaved = saved.filter(item => item.filename !== newImageMeta.filename);
      filteredSaved.push(newImageMeta);
      const limitedSaved = filteredSaved.slice(-20); // 只保留最新20张
      
      // 存储容错：超限则只保留最新10张
      try {
        localStorage.setItem(storageKey, JSON.stringify(limitedSaved));
      } catch (e) {
        console.error('存储超限，仅保留最新10张：', e);
        localStorage.setItem(storageKey, JSON.stringify(limitedSaved.slice(-10)));
      }

      // 提示生成成功
      if (statusMessage) {
        statusMessage.textContent = '生成完成，内容已保存到生成库！';
        statusMessage.classList.remove('hidden');
      }
    } catch (error) {
      alert(error.message);
    } finally {
      // 恢复按钮状态
      if (generateBtn) generateBtn.disabled = false;
      if (loading) loading.style.display = 'none';
    }
  }

  // 绑定生成图片按钮点击事件
  if (generateBtn) {
    generateBtn.addEventListener('click', generateImage);
  }

  // ========== 滚动渐入动画 ==========
  const fadeElements = document.querySelectorAll(
    '.generate-card, .input-area, .input-textarea, .generate-btn, .preview-area, .preview-box'
  );

  if (fadeElements.length > 0) {
    // 交叉观察器：元素进入可视区时添加渐入类
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
        threshold: 0.1, // 元素可见10%时触发
        rootMargin: '0px 0px -50px 0px',
      }
    );

    fadeElements.forEach((element) => {
      observer.observe(element);
    });
  }

  // ========== 标题文字打散交互效果 ==========
  const heroTitle = document.getElementById('heroTitle');
  if (heroTitle) {
    const originalText = heroTitle.textContent || '';
    const scatterRadius = 90; // 交互影响半径
    const scatterStrength = 18; // 分散强度
    heroTitle.textContent = '';

    // 拆分文字为单个span，用于独立交互
    [...originalText].forEach((char) => {
      const span = document.createElement('span');
      span.className = 'hero-letter';
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.dataset.offsetX = (Math.random() * 2 - 1).toFixed(2);
      span.dataset.offsetY = (Math.random() * 2 - 1).toFixed(2);
      span.dataset.rotate = (Math.random() * 2 - 1).toFixed(2);
      heroTitle.appendChild(span);
    });

    // 重置文字位置
    const resetLetters = () => {
      heroTitle.querySelectorAll('.hero-letter').forEach((span) => {
        span.classList.remove('is-scattered');
        span.style.transform = '';
        span.style.opacity = '';
      });
    };

    // 鼠标移动时文字分散效果
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

    // 鼠标离开时重置
    heroTitle.addEventListener('mouseleave', resetLetters);
  }

  // ========== 粒子背景动画核心逻辑 ==========
  const canvas = document.getElementById('particleCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const particleCount = 2000; // 粒子数量
    const particles = [];
    const streaks = []; // 彩色流线数组
    const pointer = { x: null, y: null, radius: 120 }; // 鼠标交互区域
    const streakPalette = ['#7aa3ff', '#b880ff', '#50e3c2', '#ff7ad9', '#ffd36e']; // 流线配色
    let streakTimer = 0;
    const streakInterval = 40; // 流线生成间隔
    const speedDamping = 0.99; // 粒子速度衰减系数（核心：避免粒子无限加速）
    const minSpeed = 0.05; // 粒子最小速度（避免完全静止）

    // 适配窗口大小调整画布尺寸
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // 创建粒子数组
    const createParticles = () => {
      particles.length = 0;
      for (let i = 0; i < particleCount; i += 1) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4, // 初始X速度
          vy: (Math.random() - 0.5) * 0.4, // 初始Y速度
          size: Math.random() * 1.7 + 0.8, // 粒子大小
        });
      }
    };

    // 生成彩色流线
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

    // 更新粒子和流线动画
    const updateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      streakTimer += 1;
      if (streakTimer >= streakInterval) {
        streakTimer = 0;
        spawnStreak();
      }

      // 更新粒子位置和交互
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // 边界反弹 + 速度衰减
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.vx *= -1;
          particle.vx *= speedDamping;
        }
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.vy *= -1;
          particle.vy *= speedDamping;
        }

        // 鼠标交互：粒子远离鼠标
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

        // 核心：速度衰减（阻尼）
        particle.vx *= speedDamping;
        particle.vy *= speedDamping;

        // 防止粒子完全静止
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

      // 更新流线
      streaks.forEach((streak, index) => {
        streak.x += streak.vx;
        streak.y += streak.vy;
        streak.life += 1;

        const progress = streak.life / streak.maxLife;
        const alpha = Math.max(0, Math.min(1, Math.sin(Math.PI * progress) * 0.75));

        // 流线渐变效果
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

        // 移除生命周期结束的流线
        if (streak.life > streak.maxLife) {
          streaks.splice(index, 1);
        }
      });

      requestAnimationFrame(updateParticles);
    };

    // 初始化粒子动画
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

  // ========== 灵感模态框核心逻辑（打开/关闭切换） ==========
  const inspireToggle = document.getElementById('inspireToggle'); 
  const doubaoModal = document.getElementById('doubaoModal'); 
  const modalContent = doubaoModal.querySelector('.modal-content');
  const closeModalBtn = document.getElementById('closeModalBtn'); 
  const submitKeywordBtn = document.getElementById('submitKeywordBtn'); 
  const keywordInput = document.getElementById('keywordInput'); 
  const resultArea = document.getElementById('resultArea'); 

  let isSubmitting = false; // 防重复提交标识
  let isModalOpen = false; // 模态框显示状态（核心：控制切换）

  /**
   * 计算模态框位置
   * 核心：显示在灵感按钮左侧，超出屏幕则显示在右侧
   */
  const calculateModalPosition = () => {
    if (!inspireToggle || !modalContent) return;

    const btnRect = inspireToggle.getBoundingClientRect();
    const modalWidth = modalContent.offsetWidth;
    const modalHeight = modalContent.offsetHeight;

    let left = btnRect.left - modalWidth - 10;
    if (left < 0) {
      left = btnRect.right + 10; // 左侧超出屏幕则显示在右侧
    }

    const top = btnRect.top; // 对齐按钮顶部

    // 设置模态框位置（加上滚动偏移，避免滚动错位）
    modalContent.style.left = `${left + window.scrollX}px`;
    modalContent.style.top = `${top + window.scrollY}px`;
  };

  // 核心：灵感按钮点击事件 - 切换模态框显示/隐藏
  if (inspireToggle && doubaoModal) {
    inspireToggle.addEventListener('click', () => {
      if (isModalOpen) {
        closeModal(); // 已打开则关闭
      } else {
        // 未打开则初始化并显示
        resultArea.value = ''; 
        keywordInput.value = '';
        doubaoModal.style.display = 'block';
        calculateModalPosition();
        keywordInput.focus();
        isModalOpen = true; // 更新状态为打开
        
        // 窗口大小/滚动时重新计算位置
        window.addEventListener('resize', calculateModalPosition);
        window.addEventListener('scroll', calculateModalPosition);
      }
    });
  }

  /**
   * 关闭模态框
   * 1. 隐藏模态框
   * 2. 重置状态
   * 3. 移除窗口监听
   */
  const closeModal = () => {
    doubaoModal.style.display = 'none';
    isSubmitting = false;
    isModalOpen = false; // 同步更新状态为关闭
    if (submitKeywordBtn) {
      submitKeywordBtn.disabled = false;
      submitKeywordBtn.textContent = '生成';
    }
    window.removeEventListener('resize', calculateModalPosition);
    window.removeEventListener('scroll', calculateModalPosition);
  };

  // 关闭按钮点击事件
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  // 点击遮罩层关闭模态框
  doubaoModal.addEventListener('click', (e) => {
    if (e.target === doubaoModal) {
      closeModal();
    }
  });

  // ESC键关闭模态框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && doubaoModal.style.display === 'block') {
      closeModal();
    }
  });

  // 输入框回车触发生成
  if (keywordInput) {
    keywordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (submitKeywordBtn && !isSubmitting) {
          submitKeywordBtn.click();
        }
      }
    });
  }

  // ========== 关键词生成描述接口请求 ==========
  if (submitKeywordBtn) {
    submitKeywordBtn.addEventListener('click', async () => {
      const keywords = keywordInput.value.trim();
      // 非空校验
      if (!keywords) {
        alert('请输入关键词！');
        keywordInput.focus();
        return;
      }
      // 防重复提交
      if (isSubmitting) return;
      isSubmitting = true;

      // 按钮状态切换
      submitKeywordBtn.disabled = true;
      submitKeywordBtn.textContent = '生成中...';
      resultArea.value = '';

      try {
        // 10秒超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        // 调用后端生成描述接口
        const response = await fetch('http://localhost:8000/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        let data;
        try {
          data = await response.json();
        } catch (e) {
          throw new Error('服务器返回无效数据，请检查后端接口格式');
        }

        // 接口返回成功处理
        if (response.ok && data.success) {
          resultArea.value = data.content || '生成成功，但未返回描述内容';
          // 自动填充到主提示词输入框
          const promptInput = document.getElementById('prompt');
          if (promptInput) {
            promptInput.value = data.content;
          }
        } else {
          throw new Error(data?.message || `生成失败：HTTP状态码 ${response.status}`);
        }
      } catch (error) {
        // 错误提示区分超时和其他错误
        const errorMsg = error.name === 'AbortError' 
          ? '请求超时，请检查后端服务是否正常' 
          : error.message || '网络错误，请稍后重试';
        alert(errorMsg);
        console.error('生成失败：', error);
      } finally {
        // 恢复按钮状态
        isSubmitting = false;
        submitKeywordBtn.disabled = false;
        submitKeywordBtn.textContent = '生成';
      }
    });
  } else {
    console.warn('未找到submitKeywordBtn元素，生成按钮事件未绑定');
  }
});