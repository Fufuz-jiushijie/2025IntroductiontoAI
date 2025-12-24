from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import base64
import os
import glob

# 初始化FastAPI
app = FastAPI()

# 跨域配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 前端参数模型
class ImageRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    width: int = 512  # 8的倍数
    height: int = 512
    steps: int = 20

# 固定输出目录
OUTPUT_DIR = "./imaginairy_output"
# 关键：imagine自动创建的子文件夹
GENERATED_DIR = os.path.join(OUTPUT_DIR, "generated")
# 确保目录存在
for dir_path in [OUTPUT_DIR, GENERATED_DIR]:
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)

@app.post("/generate-image")
async def generate_image(request: ImageRequest):
    try:
        # 1. 参数校验
        if request.width % 8 != 0 or request.height % 8 != 0:
            raise ValueError(f"尺寸必须是8的倍数！当前：{request.width}x{request.height}")
        if request.steps <= 0:
            raise ValueError("采样步数必须大于0！")
        if not request.prompt.strip():
            raise ValueError("提示词不能为空！")

        # 2. 拼接命令（参数顺序：OPTIONS在前，提示词在后）
        cmd = [
            r"C:\Users\36137\.conda\envs\ima_env2\Scripts\imagine.exe",
            "--negative-prompt", request.negative_prompt.strip(),
            "--size", f"{request.width}x{request.height}",
            "--steps", str(request.steps),
            "--outdir", OUTPUT_DIR,  # 主输出目录
            "--output-file-extension", "png",
            "--quiet",
            request.prompt.strip()  # 提示词放最后
        ]

        # 3. 执行命令（二进制模式，避免emoji编码问题）
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=False,
            timeout=300  # 5分钟超时
        )

        # 4. 检查命令返回码
        if result.returncode != 0:
            raise RuntimeError(f"imagine命令执行失败（返回码：{result.returncode}）")

        # 5. 查找图片（关键：遍历generated子文件夹）
        # 同时匹配generated子文件夹下的PNG/JPG
        img_patterns = [
            os.path.join(GENERATED_DIR, "*.png"),  # 优先找PNG
            os.path.join(GENERATED_DIR, "*.jpg"),  # 兜底找JPG
            os.path.join(OUTPUT_DIR, "*.png"),     # 兼容直接存在主目录的情况
            os.path.join(OUTPUT_DIR, "*.jpg")
        ]
        
        img_files = []
        for pattern in img_patterns:
            img_files.extend(glob.glob(pattern))
        
        if not img_files:
            raise FileNotFoundError(
                f"未找到生成的图片！\n检查路径：{GENERATED_DIR}\n当前目录文件：{os.listdir(GENERATED_DIR) if os.path.exists(GENERATED_DIR) else '目录不存在'}"
            )

        # 6. 取最新生成的图片
        img_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
        latest_img = img_files[0]
        print(f"找到最新图片：{latest_img}")  # 调试用

        # 7. 转Base64返回给前端
        with open(latest_img, "rb") as f:
            img_base64 = base64.b64encode(f.read()).decode("utf-8")

        return {"image_base64": img_base64, "image_path": latest_img}

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="生成超时！建议降低分辨率/步数，或改用GPU")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成失败：{str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)