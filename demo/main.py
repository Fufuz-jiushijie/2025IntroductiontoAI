from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import subprocess
import base64
import os
import glob
import json
from datetime import datetime
from pathlib import Path
import shutil
from typing import List, Optional
# ===== 新增：调用豆包API所需模块 =====
import requests
# ===== 替换：阿里云通义千问所需模块 =====
import dashscope
from dashscope import Generation
# 保留原有其他导入（FastAPI/模型等）

# 初始化FastAPI
app = FastAPI(title="AI Image Generator API")

# 跨域配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 固定输出目录
OUTPUT_DIR = "./imaginairy_output"
GENERATED_DIR = os.path.join(OUTPUT_DIR, "generated")
IMAGE_METADATA_FILE = os.path.join(OUTPUT_DIR, "metadata.json")


dashscope.api_key = "sk-f34678aa8d534fe587645fedbd83dac1" 

# 确保目录存在
for dir_path in [OUTPUT_DIR, GENERATED_DIR]:
    if not os.path.exists(dir_path):
        os.makedirs(dir_path, exist_ok=True)

# 挂载静态文件目录，使图片可以通过URL访问
app.mount("/images", StaticFiles(directory=GENERATED_DIR), name="images")

# 模型定义
class ImageRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    width: int = 512
    height: int = 512
    steps: int = 20

class ImageInfo(BaseModel):
    filename: str
    url: str
    prompt: str
    negative_prompt: str = ""
    width: int = 512
    height: int = 512
    steps: int = 20
    size: int
    created_at: str
    file_path: str

class DeleteRequest(BaseModel):
    filenames: List[str]
# ===== 新增：描述生成请求模型 =====
class DescriptionRequest(BaseModel):
    keywords: str  # 前端传递的关键词

def load_metadata():
    """加载图片元数据"""
    if os.path.exists(IMAGE_METADATA_FILE):
        try:
            with open(IMAGE_METADATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_metadata(metadata):
    """保存图片元数据"""
    with open(IMAGE_METADATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

def add_image_metadata(filename, prompt, negative_prompt, width, height, steps):
    """添加图片元数据"""
    metadata = load_metadata()
    
    filepath = os.path.join(GENERATED_DIR, filename)
    if os.path.exists(filepath):
        file_stat = os.stat(filepath)
        created_at = datetime.fromtimestamp(file_stat.st_ctime).isoformat()
        
        metadata[filename] = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "width": width,
            "height": height,
            "steps": steps,
            "created_at": created_at,
            "size": file_stat.st_size
        }
        
        save_metadata(metadata)
        return True
    return False

@app.post("/generate-image")
async def generate_image(request: ImageRequest):
    """生成新图片"""
    try:
        # 1. 参数校验
        if request.width % 8 != 0 or request.height % 8 != 0:
            raise ValueError(f"尺寸必须是8的倍数！当前：{request.width}x{request.height}")
        if request.steps <= 0:
            raise ValueError("采样步数必须大于0！")
        if not request.prompt.strip():
            raise ValueError("提示词不能为空！")

        # 2. 拼接命令
        cmd = [
            r"C:\Users\36137\.conda\envs\ima_env2\Scripts\imagine.exe",
            "--negative-prompt", request.negative_prompt.strip(),
            "--size", f"{request.width}x{request.height}",
            "--steps", str(request.steps),
            "--outdir", OUTPUT_DIR,
            "--output-file-extension", "png",
            "--quiet",
            request.prompt.strip()
        ]

        # 3. 执行命令
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=False,
            timeout=300
        )

        # 4. 检查命令返回码
        if result.returncode != 0:
            raise RuntimeError(f"imagine命令执行失败（返回码：{result.returncode}）")

        # 5. 查找最新生成的图片
        img_patterns = [
            os.path.join(GENERATED_DIR, "*.png"),
            os.path.join(GENERATED_DIR, "*.jpg"),
            os.path.join(GENERATED_DIR, "*.jpeg"),
            os.path.join(GENERATED_DIR, "*.webp")
        ]
        
        img_files = []
        for pattern in img_patterns:
            img_files.extend(glob.glob(pattern))
        
        if not img_files:
            raise FileNotFoundError(f"未找到生成的图片！")

        # 取最新生成的图片
        img_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
        latest_img = img_files[0]
        filename = os.path.basename(latest_img)

        # 6. 保存元数据
        add_image_metadata(
            filename=filename,
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            width=request.width,
            height=request.height,
            steps=request.steps
        )

        # 7. 转Base64返回给前端
        with open(latest_img, "rb") as f:
            img_base64 = base64.b64encode(f.read()).decode("utf-8")

        return {
            "success": True,
            "image_base64": img_base64,
            "filename": filename,
            "url": f"/images/{filename}",
            "prompt": request.prompt,
            "negative_prompt": request.negative_prompt,
            "width": request.width,
            "height": request.height,
            "steps": request.steps
        }

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="生成超时！建议降低分辨率/步数，或改用GPU")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成失败：{str(e)}")
    
@app.post("/generate")
async def generate_description(request: DescriptionRequest):
    """根据关键词调用阿里云通义千问生成描述文字"""
    try:
        # 1. 参数校验
        if not request.keywords.strip():
            raise ValueError("关键词不能为空！")
        
        print(f"【调试】接收的关键词：{request.keywords.strip()}")
        
        # 2. 调用通义千问
        response = Generation.call(
            model='qwen-turbo',
            messages=[
                {
                    "role": "user",
                    "content": f"请根据关键词【{request.keywords.strip()}】生成一段生动、详细的描述性文字，字数控制在200字左右，语言优美自然，适配AI图片生成的提示词场景。"
                }
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        # 3. 打印完整响应（确认结构）
        print(f"【调试】阿里云原始响应：{response}")
        
        # 4. 校验响应状态
        if response.status_code != 200:
            raise RuntimeError(f"通义千问调用失败：{response.message if hasattr(response, 'message') else '未知错误'}")
        
        # 5. 关键：解析output.text（而非choices）
        if not hasattr(response, 'output') or response.output is None:
            raise RuntimeError("API返回无output字段")
        
        # 读取真实的描述内容（output.text）
        description = getattr(response.output, 'text', '').strip()
        if not description:
            raise RuntimeError("API返回的描述内容为空")
        
        # 6. 正常返回
        return {
            "success": True,
            "content": description,
            "keywords": request.keywords.strip()
        }
    
    except ValueError as e:
        print(f"【错误】参数校验失败：{str(e)}")
        raise HTTPException(status_code=400, detail={"success": False, "message": str(e)})
    except Exception as e:
        import traceback
        error_msg = f"生成描述失败：{str(e)}"
        print(f"【错误】{error_msg}")
        print(f"【错误】堆栈：{traceback.format_exc()}")
        # 规范返回错误格式，确保前端能解析
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": error_msg}
        )

@app.get("/api/images", response_model=List[ImageInfo])
async def get_images(page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100)):
    """获取图片列表（支持分页）"""
    try:
        # 获取所有图片文件
        img_patterns = ["*.png", "*.jpg", "*.jpeg", "*.webp", "*.gif", "*.bmp"]
        img_files = []
        
        for pattern in img_patterns:
            img_files.extend(Path(GENERATED_DIR).glob(pattern))
        
        # 按修改时间排序（最新的在前）
        img_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        
        # 分页
        total = len(img_files)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_files = img_files[start_idx:end_idx]
        
        # 加载元数据
        metadata = load_metadata()
        
        # 构建响应数据
        images = []
        for img_file in paginated_files:
            filename = img_file.name
            file_stat = img_file.stat()
            created_at = datetime.fromtimestamp(file_stat.st_ctime).isoformat()
            
            # 获取元数据
            img_metadata = metadata.get(filename, {})
            
            images.append({
                "filename": filename,
                "url": f"/images/{filename}",
                "prompt": img_metadata.get("prompt", "未知提示词"),
                "negative_prompt": img_metadata.get("negative_prompt", ""),
                "width": img_metadata.get("width", 512),
                "height": img_metadata.get("height", 512),
                "steps": img_metadata.get("steps", 20),
                "size": file_stat.st_size,
                "created_at": img_metadata.get("created_at", created_at),
                "file_path": str(img_file)
            })
        
        return images
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取图片列表失败：{str(e)}")

@app.get("/api/images/count")
async def get_images_count():
    """获取图片总数"""
    try:
        img_patterns = ["*.png", "*.jpg", "*.jpeg", "*.webp", "*.gif", "*.bmp"]
        total = 0
        
        for pattern in img_patterns:
            total += len(list(Path(GENERATED_DIR).glob(pattern)))
        
        return {"total": total}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取图片数量失败：{str(e)}")

@app.delete("/api/images")
async def delete_images(request: DeleteRequest):
    """删除图片"""
    try:
        deleted_files = []
        failed_files = []
        
        for filename in request.filenames:
            filepath = os.path.join(GENERATED_DIR, filename)
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                    deleted_files.append(filename)
                    
                    # 从元数据中删除
                    metadata = load_metadata()
                    if filename in metadata:
                        del metadata[filename]
                        save_metadata(metadata)
                        
                except Exception as e:
                    failed_files.append({"filename": filename, "error": str(e)})
            else:
                failed_files.append({"filename": filename, "error": "文件不存在"})
        
        return {
            "success": True,
            "deleted": deleted_files,
            "failed": failed_files,
            "message": f"成功删除 {len(deleted_files)} 个文件"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除图片失败：{str(e)}")

@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "image_dir": GENERATED_DIR,
        "total_images": await get_images_count()
    }

@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "AI Image Generator API",
        "version": "1.0.0",
        "endpoints": {
            "generate": "/generate-image",
            "list_images": "/api/images",
            "count": "/api/images/count",
            "delete": "/api/images",
            "health": "/api/health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)