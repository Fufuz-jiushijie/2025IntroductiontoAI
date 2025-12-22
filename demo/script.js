// 导航栏粘性效果
const nav = document.querySelector('.nav');
window.addEventListener('scroll', fixNav);

function fixNav() {
  if (window.scrollY > nav.offsetHeight + 150) {
    nav.classList.add('active');
  } else {
    nav.classList.remove('active');
  }
}

// 生成按钮交互逻辑
const generateBtn = document.getElementById('generate-btn');
const imagePreview = document.getElementById('image-preview');

generateBtn.addEventListener('click', function() {
  // 保存原始按钮内容
  const originalText = this.innerHTML;
  
  // 设置加载状态
  this.disabled = true;
  this.innerHTML = '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full loader"></div><span>生成中...</span>';
  
  // 模拟AI生成延迟（2秒）
  setTimeout(function() {
    // 恢复按钮状态
    generateBtn.disabled = false;
    generateBtn.innerHTML = originalText;
    
    // 展示生成的图片
    imagePreview.innerHTML = `<img src="https://picsum.photos/id/1035/800/600" alt="AI生成图片" class="w-full h-full object-cover">`;
  }, 2000);
});

// 文本框字符限制（最大500字符）
const textarea = document.querySelector('textarea');
textarea.addEventListener('input', function() {
  const maxCount = 500;
  if (this.value.length > maxCount) {
    this.value = this.value.substring(0, maxCount);
  }
});

// 滚动渐入效果：检测元素是否进入视口
// 滚动渐入效果：支持重复触发动画
const fadeElements = document.querySelectorAll('.generate-card, .input-area, .input-textarea, .generate-btn, .preview-area, .preview-box');

// 创建观察者实例
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    // 当元素进入视口时，添加 fade-in 类（触发动画）
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in');
    } else {
      // 当元素离开视口时，移除 fade-in 类（重置为初始状态）
      entry.target.classList.remove('fade-in');
    }
  });
}, {
  threshold: 0.1, // 元素进入视口10%时触发
  rootMargin: '0px 0px -50px 0px' // 底部偏移，提前/延后触发
});

// 为每个元素添加观察
fadeElements.forEach(element => {
  observer.observe(element);
});