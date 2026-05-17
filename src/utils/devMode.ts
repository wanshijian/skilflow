// === SkillFlow 开发模式 ===
// 无Supabase/Claude凭据时，用mock数据跑通完整流程

const IS_DEV = true // 部署后改为 false

// === Mock Tools ===
const MOCK_TOOLS = [
  {
    id: '1', title: 'Word 转 PDF', slug: 'word-to-pdf',
    description: '拖拽上传 Word 文档，一键导出高质量 PDF',
    prompt: 'Word to PDF converter', tool_type: 'converter', style: 'clean',
    html_code: '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Word to PDF</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#f5f5f7;display:flex;flex-direction:column;align-items:center;padding:20px;min-height:100vh}.container{max-width:600px;width:100%;background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,.08)}h1{font-size:24px;margin-bottom:8px}p{color:#666;margin-bottom:20px}.dropzone{border:2px dashed #ccc;border-radius:12px;padding:48px 24px;text-align:center;cursor:pointer}.dropzone:hover{border-color:#e74c3c;background:#fff5f5}.btn{margin-top:16px;padding:12px 24px;background:#e74c3c;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer}</style></head><body><div class="container"><h1>Word 转 PDF</h1><p>点击下方区域上传 .docx 文件，自动转换预览，然后导出 PDF</p><div class="dropzone" id="drop"><p>点击选择 Word 文件</p><input type="file" id="file" accept=".docx" style="display:none"></div><div id="preview" style="margin-top:20px;display:none"></div><button class="btn" onclick="window.print()" style="display:none" id="printBtn">导出 PDF</button></div><script>var dz=document.getElementById("drop");var fi=document.getElementById("file");var pv=document.getElementById("preview");var pb=document.getElementById("printBtn");dz.onclick=function(){fi.click()};fi.onchange=function(e){var f=e.target.files[0];if(!f||!f.name.endsWith(".docx")){pv.innerHTML="<p style=color:red>请上传 .docx 文件</p>";pv.style.display="block";return}pv.innerHTML="<p>正在预览: "+f.name+" ("+(f.size/1024).toFixed(1)+" KB)</p><p style=color:green>转换完成！点击下方按钮导出 PDF</p>";pv.style.display="block";pb.style.display="inline-block"}</script></body></html>',
    download_count: 328, is_premium: false, user_id: 'dev', created_at: '2026-05-10'
  },
  {
    id: '2', title: '番茄钟计时器', slug: 'pomodoro-timer',
    description: '工作和休息自动切换，手机电脑都能用',
    prompt: 'Pomodoro timer', tool_type: 'utility', style: 'minimal',
    html_code: '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>番茄钟</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0F172A;color:#fafafa;display:flex;justify-content:center;align-items:center;min-height:100vh}.timer{text-align:center}.time{font-size:80px;font-weight:800;letter-spacing:-.04em}.label{font-size:14px;color:#94A3B8;margin:8px 0 20px}.btn{padding:10px 28px;background:#F97316;color:#fff;border:none;border-radius:9999px;font-size:16px;cursor:pointer;margin:4px}</style></head><body><div class="timer"><div class="time" id="time">25:00</div><div class="label" id="label">工作时间</div><button class="btn" id="btn" onclick="toggle()">开始</button></div><script>var t=1500,r=300,w=true,s=false,i;function u(){var m=Math.floor(t/60),s=t%60;document.getElementById("time").textContent=m+":"+(s<10?"0":"")+s}function toggle(){if(s){clearInterval(i);s=false;document.getElementById("btn").textContent="继续"}else{s=true;document.getElementById("btn").textContent="暂停";i=setInterval(function(){t--;u();if(t<=0){clearInterval(i);w=!w;t=w?1500:300;document.getElementById("label").textContent=w?"工作时间":"休息时间";s=false;document.getElementById("btn").textContent="开始";u()}},1000)}}u()</script></body></html>',
    download_count: 156, is_premium: false, user_id: 'dev', created_at: '2026-05-09'
  },
  {
    id: '3', title: '二维码生成器 Pro', slug: 'qr-generator-pro',
    description: '输入文字或链接，生成高清二维码，支持自定义颜色和Logo',
    prompt: 'QR code generator with custom colors', tool_type: 'generator', style: 'clean',
    html_code: '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>二维码生成器</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0F172A;color:#fafafa;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px}.app{max-width:400px;width:100%;text-align:center}h1{margin-bottom:20px}input{width:100%;padding:12px;border:1px solid #334155;border-radius:8px;background:#1E293B;color:#fafafa;font-size:16px;margin-bottom:12px}#qr{margin:20px auto;background:#fff;padding:16px;border-radius:12px;display:inline-block}.btn{padding:12px 24px;background:#F97316;color:#fff;border:none;border-radius:9999px;font-size:14px;cursor:pointer}</style></head><body><div class="app"><h1>二维码生成器</h1><input id="text" placeholder="输入文字或链接…" oninput="gen()"><div id="qr"></div></div><script>function gen(){var t=document.getElementById("text").value;var d=document.getElementById("qr");d.innerHTML="";if(!t)return;var s=200;var c=document.createElement("canvas");c.width=s;c.height=s;var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,s,s);x.fillStyle="#000";var b=Math.ceil(s/25);for(var i=0;i<b;i++)for(var j=0;j<b;j++)if(Math.random()>.5){x.fillRect(i*25,j*25,23,23)};var u=t.split("").reduce(function(a,c){return a+c.charCodeAt(0)},0)%s;x.fillStyle="#F97316";x.fillRect(u,(s-40)/2,40,40);d.appendChild(c)}gen()</script></body></html>',
    download_count: 892, is_premium: true, premium_price: 19.9, user_id: 'dev', created_at: '2026-05-08'
  },
]

// === Mock User ===
const MOCK_USER = {
  id: 'dev-user-001',
  email: 'dev@skilflow.local',
  nickname: '开发者',
  avatar: '',
  lifetime_free_remaining: 2,
}

// === Mock API Helpers ===
const delay = (ms = 300) => new Promise(r => setTimeout(r, ms))

export const devMode = {
  isActive: IS_DEV && !process.env.SUPABASE_URL,

  // Tools
  async listTools(params: any) {
    await delay(200)
    let tools = [...MOCK_TOOLS]
    if (params.premium) tools = tools.filter(t => t.is_premium)
    if (params.toolType) tools = tools.filter(t => t.tool_type === params.toolType)
    const sorted = params.sort === 'new'
      ? tools.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      : tools.sort((a, b) => b.download_count - a.download_count)
    return { data: sorted, count: sorted.length, error: null }
  },

  async getToolById(id: string) {
    await delay(100)
    const tool = MOCK_TOOLS.find(t => t.id === id)
    return { data: tool || null, error: tool ? null : new Error('Not found') }
  },

  // Generation
  async generateCode(params: { prompt: string; toolType: string; style: string }) {
    await delay(1500) // 模拟生成时间
    const { toolType } = params

    if (toolType === 'game') {
      return {
        data: {
          success: true,
          title: '贪吃蛇',
          html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>贪吃蛇</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0F172A;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:system-ui,sans-serif}.game{text-align:center}h1{color:#fafafa;margin-bottom:12px;font-size:20px}canvas{border:1px solid #334155;border-radius:8px;background:#1E293B}.score{color:#94A3B8;font-size:14px;margin-top:8px}</style></head><body><div class="game"><h1>🐍 贪吃蛇</h1><canvas id="c" width="300" height="300"></canvas><div class="score" id="s">分数: 0</div></div><script>var c=document.getElementById("c"),x=c.getContext("2d"),g=15,s=[{x:8,y:8}],d={x:1,y:0},f={x:8,y:15},sc=0,t;function draw(){x.fillStyle="#1E293B";x.fillRect(0,0,300,300);x.fillStyle="#F97316";s.forEach(p=>x.fillRect(p.x*g,p.y*g,g-1,g-1));x.fillStyle="#34d399";x.fillRect(f.x*g,f.y*g,g-1,g-1);document.getElementById("s").textContent="分数: "+sc}function step(){var h={x:s[0].x+d.x,y:s[0].y+d.y};if(h.x<0||h.x>=20||h.y<0||h.y>=20||s.some(p=>p.x===h.x&&p.y===h.y)){clearInterval(t);x.fillStyle="#ef4444";x.font="20px system-ui";x.fillText("游戏结束! 分数: "+sc,40,150);return}s.unshift(h);if(h.x===f.x&&h.y===f.y){sc++;f={x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)}}else{s.pop()}draw()}document.onkeydown=function(e){if(e.key==="ArrowUp"&&d.y!==1)d={x:0,y:-1};if(e.key==="ArrowDown"&&d.y!==-1)d={x:0,y:1};if(e.key==="ArrowLeft"&&d.x!==1)d={x:-1,y:0};if(e.key==="ArrowRight"&&d.x!==-1)d={x:1,y:0}};t=setInterval(step,120);draw()</script></body></html>`
        },
        error: null
      }
    }
    if (toolType === 'converter') {
      return {
        data: { success: true, title: '文件转换工具', html: MOCK_TOOLS[0].html_code },
        error: null
      }
    }
    return {
      data: { success: true, title: '实用小工具', html: MOCK_TOOLS[1].html_code },
      error: null
    }
  },

  // Quota
  async checkQuota(_userId: string) {
    return { data: { canDownload: true, canUseFree: MOCK_USER.lifetime_free_remaining > 0, remainingFree: MOCK_USER.lifetime_free_remaining }, error: null }
  },

  async consumeFree(_userId: string, _toolId: string) {
    if (MOCK_USER.lifetime_free_remaining <= 0) return { data: { success: false }, error: new Error('No quota') }
    MOCK_USER.lifetime_free_remaining--
    return { data: { success: true }, error: null }
  },

  async shareUnlock(_userId: string, _toolId: string) {
    return { data: { success: true }, error: null }
  },

  // User
  getUser() {
    return { ...MOCK_USER }
  },
}

// === 便捷包装：自动判断用真实API还是Dev Mode ===
export function useAPI() {
  if (devMode.isActive) return devMode
  return null // null = 用真实Supabase
}
