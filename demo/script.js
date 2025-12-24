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

const generateBtn = document.getElementById("generateBtn");
        const loading = document.getElementById("loading");
        const result = document.getElementById("result");
        const imageOutput = document.getElementById("imageOutput");

        async function generateImage() {
            const prompt = document.getElementById("prompt").value.trim();
            if (!prompt) {
                alert("请输入提示词！");
                return;
            }

            // 解析尺寸（兼容用户输入的512x512格式）
            const sizeStr = document.getElementById("size").value.trim();
            const sizeArr = sizeStr.split("x");
            if (sizeArr.length !== 2) {
                alert("尺寸格式错误！请输入如512x512的格式");
                return;
            }
            const width = parseInt(sizeArr[0]);
            const height = parseInt(sizeArr[1]);
            if (isNaN(width) || isNaN(height)) {
                alert("尺寸必须是数字！");
                return;
            }

            // 采样步数
            const steps = parseInt(document.getElementById("steps").value);
            if (isNaN(steps) || steps < 1) {
                alert("采样步数必须大于0！");
                return;
            }

            // 禁用按钮，显示加载
            generateBtn.disabled = true;
            loading.style.display = "block";
            result.style.display = "none";

            try {
                // 向后端发送请求
                const response = await fetch("http://localhost:8000/generate-image", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        prompt: prompt,
                        negative_prompt: document.getElementById("negativePrompt").value.trim(),
                        width: width,
                        height: height,
                        steps: steps
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.detail || "生成失败");
                }

                const data = await response.json();
                // 展示图片
                imageOutput.src = `data:image/png;base64,${data.image_base64}`;
                result.style.display = "block";
            } catch (error) {
                alert(error.message);
            } finally {
                // 恢复按钮
                generateBtn.disabled = false;
                loading.style.display = "none";
            }
        }

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

