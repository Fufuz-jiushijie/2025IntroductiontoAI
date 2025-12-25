class ImageGallery {
    constructor() {
        this.gridElement = document.getElementById('galleryGrid');
        this.emptyElement = document.getElementById('galleryEmpty');
        this.clearButton = document.getElementById('clearGallery');
        this.apiBaseUrl = 'http://localhost:8000';
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadImages();
            
            // 每隔30秒自动刷新
            setInterval(() => this.loadImages(), 30000);
            
            // 清空按钮事件
            if (this.clearButton) {
                this.clearButton.addEventListener('click', () => this.clearGallery());
            }
            
            // 监听删除事件
            this.gridElement.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) {
                    const card = e.target.closest('.gallery-card');
                    const filename = card.dataset.filename;
                    this.deleteImage(filename);
                }
                
                if (e.target.closest('.download-btn')) {
                    const card = e.target.closest('.gallery-card');
                    const imgUrl = card.querySelector('img').src;
                    const filename = card.dataset.filename;
                    this.downloadImage(imgUrl, filename);
                }
            });
            
        } catch (error) {
            console.error('画廊初始化失败:', error);
            this.showEmptyState();
        }
    }
    
    async loadImages() {
        try {
            console.log('正在加载图片...');
            const response = await fetch(`${this.apiBaseUrl}/api/images`);
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            const images = await response.json();
            
            if (images && images.length > 0) {
                this.displayImages(images);
                this.showGallery();
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            console.error('加载图片失败:', error);
            this.showEmptyState();
        }
    }
    
    displayImages(images) {
        this.gridElement.innerHTML = '';
        
        images.forEach(image => {
            const card = this.createImageCard(image);
            this.gridElement.appendChild(card);
        });
    }
    
    createImageCard(image) {
        const card = document.createElement('article');
        card.className = 'gallery-card';
        card.dataset.filename = image.filename;
        
        // 图片容器
        const imgContainer = document.createElement('div');
        imgContainer.className = 'image-container';
        
        // 图片元素
        const img = document.createElement('img');
        img.src = `${this.apiBaseUrl}${image.url}`;
        img.alt = image.prompt;
        img.loading = 'lazy';
        
        // 图片加载错误处理
        img.onerror = () => {
            img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23101324"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%237aa3ff" font-family="Arial" font-size="14">图片加载失败</text></svg>';
        };
        
        // 操作按钮
        const actions = document.createElement('div');
        actions.className = 'image-actions';
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.innerHTML = '↓';
        downloadBtn.title = '下载图片';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = '删除图片';
        
        actions.appendChild(downloadBtn);
        actions.appendChild(deleteBtn);
        
        imgContainer.appendChild(img);
        imgContainer.appendChild(actions);
        
        // 图片信息
        const info = document.createElement('div');
        info.className = 'gallery-info';
        
        const title = document.createElement('h3');
        title.textContent = this.truncateText(image.prompt, 30);
        
        const meta = document.createElement('p');
        meta.textContent = `尺寸 ${image.width}x${image.height} · 步数 ${image.steps}`;
        
        const extra = document.createElement('p');
        extra.textContent = image.negative_prompt
            ? `负提示词：${this.truncateText(image.negative_prompt, 25)}`
            : '负提示词：无';
        
        const time = document.createElement('span');
        const date = new Date(image.created_at);
        time.textContent = `生成时间：${date.toLocaleString('zh-CN')}`;
        
        info.appendChild(title);
        info.appendChild(meta);
        info.appendChild(extra);
        info.appendChild(time);
        
        card.appendChild(imgContainer);
        card.appendChild(info);
        
        return card;
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async deleteImage(filename) {
        if (!confirm(`确定要删除图片 "${filename}" 吗？此操作不可恢复。`)) {
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/images`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filenames: [filename]
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 从DOM中移除图片卡片
                const card = document.querySelector(`[data-filename="${filename}"]`);
                if (card) {
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.8)';
                    setTimeout(() => {
                        card.remove();
                        
                        // 检查是否还有图片
                        const remaining = document.querySelectorAll('.gallery-card');
                        if (remaining.length === 0) {
                            this.showEmptyState();
                        }
                    }, 300);
                }
                
                console.log('删除成功:', result.message);
            } else {
                throw new Error('删除失败');
            }
        } catch (error) {
            console.error('删除图片失败:', error);
            alert('删除失败，请检查网络连接或稍后重试。');
        }
    }
    
    async clearGallery() {
        if (!confirm('确定要清空所有图片吗？此操作不可恢复。')) {
            return;
        }
        
        try {
            // 获取所有文件名
            const cards = document.querySelectorAll('.gallery-card');
            const filenames = Array.from(cards).map(card => card.dataset.filename);
            
            if (filenames.length === 0) {
                alert('画廊已经是空的');
                return;
            }
            
            const response = await fetch(`${this.apiBaseUrl}/api/images`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filenames: filenames
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 动画效果清除所有卡片
                cards.forEach(card => {
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.8)';
                });
                
                setTimeout(() => {
                    this.gridElement.innerHTML = '';
                    this.showEmptyState();
                }, 500);
                
                console.log('清空成功:', result.message);
            } else {
                throw new Error('清空失败');
            }
        } catch (error) {
            console.error('清空画廊失败:', error);
            alert('清空失败，请检查网络连接或稍后重试。');
        }
    }
    
    downloadImage(imageUrl, filename) {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    
    showGallery() {
        this.gridElement.classList.remove('hidden');
        this.emptyElement.classList.add('hidden');
    }
    
    showEmptyState() {
        this.gridElement.classList.add('hidden');
        this.emptyElement.classList.remove('hidden');
    }
}

// 页面加载完成后初始化画廊
document.addEventListener('DOMContentLoaded', () => {
    new ImageGallery();
});